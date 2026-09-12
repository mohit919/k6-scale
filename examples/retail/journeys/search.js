import { getStep } from './common.js';
export function runSearch() {
  getStep('search', 'home', '/');
  getStep('search', 'contacts', '/contacts.php');
}
