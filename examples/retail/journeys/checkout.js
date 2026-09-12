import { getStep } from './common.js';
export function runCheckout() {
  getStep('checkout', 'basket', '/');
  getStep('checkout', 'confirm', '/contacts.php');
}
