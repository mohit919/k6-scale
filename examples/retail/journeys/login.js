import { getStep } from './common.js';
export function runLogin() {
  getStep('login', 'login-page', '/my_messages.php');
}
