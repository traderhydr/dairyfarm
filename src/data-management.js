import { clearAllData, loadSampleData } from './state.js';
import { openConfirmModal } from './ui/modal.js';
import { showToast } from './ui/toast.js';

export function initDataManagement() {
  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    openConfirmModal(
      'Load Sample Farm Data?',
      'This will restore the starter sample records for cashbook, cow AI tracking, monthly Feed, milkers, Wachi, health logs, cattle sales, and Doodhi Khata.',
      () => {
        loadSampleData();
        showToast('Sample data loaded!');
      }
    );
  });

  document.getElementById('clearAllBtn').addEventListener('click', () => {
    openConfirmModal(
      'Clear All Farm Records?',
      'This will empty all cashbook, cow AI, monthly Feed, Milkers, Wachi, health, sold cow, and Doodhi Khata records so you can start fresh.',
      () => {
        clearAllData();
        showToast('All records cleared.');
      }
    );
  });
}
