/* JP BOARD ROOM — EXTERNAL PROMO HML ENVIRONMENT LOCK
 * Do not point to production until Board approval after authenticated QA.
 * In HML, set the Firebase project config issued for jp-workspace-av60-hml.
 * Set JP_EXT_SECURE_BANK_VERIFIED=true only after A09 verifies private read rules.
 */
window.JP_EXT_FIREBASE_CONFIG = Object.freeze({
  "apiKey": "AIzaSyAgGd6f0xQS2F7L8rKhB4Qhcz1eAlKgaPE",
  "authDomain": "jp-painel-brindes.firebaseapp.com",
  "databaseURL": "https://jp-painel-brindes-default-rtdb.firebaseio.com",
  "projectId": "jp-painel-brindes",
  "storageBucket": "jp-painel-brindes.firebasestorage.app",
  "messagingSenderId": "843544648278",
  "appId": "1:843544648278:web:066c8e64e17da046cf79f7",
  "measurementId": "G-VB6Y2TS796"
}); // same Firebase project as main Workspace; personal-data writes remain blocked until rules are secured.
window.JP_EXT_SECURE_BANK_VERIFIED = false; // access/security audit required.
