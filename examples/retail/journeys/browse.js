import { getStep } from './common.js';
export function runBrowse() {
  getStep('browse', 'home', '/');
  getStep('browse', 'news', '/news.php');
}
