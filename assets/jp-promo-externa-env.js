/* JP BOARD ROOM — EXTERNAL PROMO HML ENVIRONMENT LOCK
 * Do not point to production until Board approval after authenticated QA.
 * In HML, set the Firebase project config issued for jp-workspace-av60-hml.
 * Set JP_EXT_SECURE_BANK_VERIFIED=true only after A09 verifies private read rules.
 */
window.JP_EXT_FIREBASE_CONFIG = null; // HML config required; deliberate fail closed.
window.JP_EXT_SECURE_BANK_VERIFIED = false; // access/security audit required.
