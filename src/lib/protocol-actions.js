// What happens to the records when a protocol is started, a step is done, early heat is logged, and so on.
// Pure functions over the farm `state` object (they mutate it; the caller commits).
import { BREEDING_CATEGORY, FTAI_STEP, PD_STEP, TEMPLATES, buildSchedule, parseLocal, pdSchedule } from './protocols.js';
import { sameAnimal } from './animals.js';

let counter = 0;
const uid = (prefix) => `${prefix}-${Date.now()}-${counter++}`;

export const protocolsOf = (state, tag) => (state.protocols || []).filter((p) => sameAnimal(p.animalTag, tag));
export const activeProtocolOf = (state, tag) => protocolsOf(state, tag).find((p) => p.status === 'Active') || null;
export const tasksOf = (state, protocolId) => (state.healthRecords || [])
  .filter((h) => h.category === BREEDING_CATEGORY && h.protocolId === protocolId)
  .sort((a, b) => (a.stepIndex ?? 99) - (b.stepIndex ?? 99) || String(a.dueAt).localeCompare(String(b.dueAt)));

function makeTask(protocol, spec) {
  return {
    id: uid('ptask'),
    category: BREEDING_CATEGORY,
    protocolId: protocol.id,
    stepIndex: spec.index,
    stepKey: spec.key,
    target: protocol.animalTag,
    type: spec.label,
    dueAt: spec.dueAt,
    ...(spec.windowStart ? { windowStart: spec.windowStart, windowEnd: spec.windowEnd } : {}),
    dateGiven: String(spec.dueAt).slice(0, 10),
    intervalDays: 0,
    medicine: '',
    cost: 0,
    status: 'Scheduled'
  };
}

/**
 * Start a protocol for one cow or a batch. Each cow gets a protocol record and one task per step.
 * A cow that is already in an active protocol is skipped (returned in `skipped`).
 */
export function enrollProtocol(state, { tags, template, day0 }) {
  const schedule = buildSchedule(template, day0);
  const result = { started: [], skipped: [] };
  if (!schedule.length) return result;
  state.protocols = state.protocols || [];
  state.healthRecords = state.healthRecords || [];
  for (const tag of tags) {
    if (activeProtocolOf(state, tag)) { result.skipped.push(tag); continue; }
    const protocol = {
      id: uid('proto'), animalTag: tag, template, templateName: TEMPLATES[template].name,
      day0, status: 'Active', steps: schedule.length
    };
    state.protocols.unshift(protocol);
    // newest first, like every list in the app; the steps keep their order through stepIndex
    state.healthRecords.unshift(...schedule.map((spec) => makeTask(protocol, spec)).reverse());
    result.started.push(protocol);
  }
  return result;
}

function cancelOpenTasks(state, protocolId, reason, exceptId) {
  for (const t of tasksOf(state, protocolId)) {
    if (t.status === 'Scheduled' && t.id !== exceptId) { t.status = 'Cancelled'; t.cancelReason = reason; }
  }
}

/** The insemination itself: logs the AI, closes the protocol, starts the pregnancy-check task. */
function recordInsemination(state, protocol, { when, sire, via, exceptTaskId }) {
  const aiAt = parseLocal(when) ? when : protocol.day0;
  cancelOpenTasks(state, protocol.id, via === 'Early heat' ? 'Early heat' : 'Skipped before AI', exceptTaskId);

  const record = {
    id: uid('cow'),
    cowTag: protocol.animalTag,
    aiDate: aiAt.slice(0, 10),
    aiAt,
    semenBull: sire || '',
    pregStatus: 'Awaiting PD Check',
    notes: via === 'Early heat' ? `Early heat during ${protocol.templateName}: bred without waiting for the protocol` : `FTAI after ${protocol.templateName}`,
    protocolId: protocol.id
  };
  state.breedingRecords.unshift(record);

  protocol.status = 'Bred';
  protocol.bredVia = via;
  protocol.aiAt = aiAt;
  protocol.sire = sire || '';
  protocol.breedingRecordId = record.id;
  protocol.endedAt = aiAt;

  // a heifer's stage follows her first AI
  const heifer = (state.wachiList || []).find((w) => sameAnimal(w.tag, protocol.animalTag));
  if (heifer) heifer.stage = 'Inseminated (1st AI Done)';

  // pregnancy check, 30 to 35 days later
  const pd = pdSchedule(aiAt);
  if (pd.dueAt) {
    state.healthRecords.unshift(makeTask(protocol, { index: protocol.steps, key: PD_STEP, label: 'Pregnancy Check (PD)', ...pd }));
  }
  return record;
}

/** Mark a protocol task done. The final AI step and the PD check ask for a little more (sire / result). */
export function completeTask(state, taskId, { when, sire, pdResult } = {}) {
  const task = (state.healthRecords || []).find((h) => h.id === taskId && h.category === BREEDING_CATEGORY);
  if (!task || task.status !== 'Scheduled') return null;
  const protocol = (state.protocols || []).find((p) => p.id === task.protocolId);
  const doneAt = parseLocal(when) ? when : task.dueAt;
  task.status = 'Done';
  task.doneAt = doneAt;
  if (!protocol) return task;

  if (task.stepKey === FTAI_STEP && protocol.status === 'Active') {
    recordInsemination(state, protocol, { when: doneAt, sire, via: 'FTAI', exceptTaskId: task.id });
  } else if (task.stepKey === PD_STEP) {
    const record = state.breedingRecords.find((r) => r.id === protocol.breedingRecordId);
    if (record && pdResult) record.pregStatus = pdResult === 'pregnant' ? 'Confirmed Pregnant' : 'Repeat / Not Pregnant';
    protocol.pdResult = pdResult === 'pregnant' ? 'Pregnant' : pdResult === 'open' ? 'Not pregnant' : '';
    protocol.pdAt = doneAt;
  }
  return task;
}

/** "Early heat / Breed now": log the AI immediately and cancel the rest of the hormone steps. */
export function earlyHeat(state, protocolId, { when, sire } = {}) {
  const protocol = (state.protocols || []).find((p) => p.id === protocolId);
  if (!protocol || protocol.status !== 'Active') return null;
  return recordInsemination(state, protocol, { when, sire, via: 'Early heat' });
}

/** Stop a protocol and cancel its open steps. */
export function cancelProtocol(state, protocolId, reason = 'Cancelled') {
  const protocol = (state.protocols || []).find((p) => p.id === protocolId);
  if (!protocol || protocol.status !== 'Active') return false;
  cancelOpenTasks(state, protocolId, reason);
  protocol.status = 'Cancelled';
  protocol.cancelReason = reason;
  return true;
}

/** Skip one step without stopping the protocol. */
export function skipTask(state, taskId) {
  const task = (state.healthRecords || []).find((h) => h.id === taskId && h.category === BREEDING_CATEGORY);
  if (!task || task.status !== 'Scheduled') return false;
  task.status = 'Cancelled';
  task.cancelReason = 'Skipped';
  return true;
}

/** Everything the screens need about one protocol: its tasks, progress and the next step. */
export function protocolView(state, protocol) {
  const tasks = tasksOf(state, protocol.id);
  const steps = tasks.filter((t) => t.stepKey !== PD_STEP);
  const done = steps.filter((t) => t.status === 'Done').length;
  const next = steps.find((t) => t.status === 'Scheduled') || null;
  const pd = tasks.find((t) => t.stepKey === PD_STEP) || null;
  const record = (state.breedingRecords || []).find((r) => r.id === protocol.breedingRecordId) || null;
  return {
    protocol, tasks, steps, done, total: protocol.steps || steps.length, next, pd, record,
    nextNumber: next ? next.stepIndex + 1 : null
  };
}
