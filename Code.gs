/**
 * SEDGEMORE — Group Proposal Generator (Web App backend)
 * Storage: a Google Sheet created automatically on first use.
 * Auth: Google Workspace login (deploy with access = "Anyone within sedgemoretravel.com").
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Sedgemore — Proposal Generator')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- spreadsheet store ---------- */
function getSS_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SS_ID');
  let ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { id = null; }
  }
  if (!id) {
    ss = SpreadsheetApp.create('Sedgemore Proposal Generator — Data');
    props.setProperty('SS_ID', ss.getId());
  }
  ensureSheet_(ss, 'Drafts',    ['key', 'name', 'status', 'createdBy', 'createdAt', 'lastEditedBy', 'lastEditedAt', 'json']);
  ensureSheet_(ss, 'Templates', ['name', 'savedBy', 'savedAt', 'json']);
  ensureSheet_(ss, 'Settings',  ['user', 'json']);
  migrateDrafts_(ss);
  return ss;
}

/* One-time migration: old format was [key, name, savedBy, savedAt, json] */
function migrateDrafts_(ss) {
  const sh = ss.getSheetByName('Drafts');
  const header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  if (header[2] === 'status') return; // already new format
  const old = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : [];
  sh.clear();
  sh.appendRow(['key', 'name', 'status', 'createdBy', 'createdAt', 'lastEditedBy', 'lastEditedAt', 'json']);
  old.forEach(r => {
    if (r[0]) sh.appendRow([r[0], r[1], 'Draft', r[2], r[3], r[2], r[3], r[4]]);
  });
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function rows_(sh) {
  const v = sh.getDataRange().getValues();
  return v.slice(1); // skip header
}

/* ---------- user ---------- */
function getUser() {
  return Session.getActiveUser().getEmail() || 'unknown';
}

/* ---------- drafts ---------- */
function listDrafts() {
  const sh = getSS_().getSheetByName('Drafts');
  return rows_(sh)
    .filter(r => r[0])
    .map(r => ({ key: r[0], name: r[1], status: r[2] || 'Draft', createdBy: r[3], createdAt: r[4], lastEditedBy: r[5], lastEditedAt: r[6] }));
}

function saveDraft(key, name, json) {
  const sh = getSS_().getSheetByName('Drafts');
  const data = rows_(sh);
  const user = getUser();
  const now = new Date().toISOString();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      // keep status, createdBy, createdAt; update name, lastEdited, json
      sh.getRange(i + 2, 2).setValue(name);
      sh.getRange(i + 2, 6, 1, 3).setValues([[user, now, json]]);
      return listDrafts();
    }
  }
  sh.appendRow([key, name, 'Draft', user, now, user, now, json]);
  return listDrafts();
}

function setDraftStatus(key, status) {
  const sh = getSS_().getSheetByName('Drafts');
  const data = rows_(sh);
  const user = getUser();
  const now = new Date().toISOString();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sh.getRange(i + 2, 3).setValue(status);
      sh.getRange(i + 2, 6, 1, 2).setValues([[user, now]]);
      break;
    }
  }
  return listDrafts();
}

function loadDraft(key) {
  const sh = getSS_().getSheetByName('Drafts');
  const row = rows_(sh).find(r => r[0] === key);
  return row ? row[7] : null;
}

function deleteDraft(key) {
  const sh = getSS_().getSheetByName('Drafts');
  const data = rows_(sh);
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === key) sh.deleteRow(i + 2);
  }
  return listDrafts();
}

/* ---------- shared hotel templates ---------- */
function listTemplates() {
  const sh = getSS_().getSheetByName('Templates');
  return rows_(sh).filter(r => r[0]).map(r => ({ name: r[0], json: r[3] }));
}

function saveTemplate(name, json) {
  const sh = getSS_().getSheetByName('Templates');
  const data = rows_(sh);
  const user = getUser();
  const now = new Date().toISOString();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === name) {
      sh.getRange(i + 2, 1, 1, 4).setValues([[name, user, now, json]]);
      return listTemplates();
    }
  }
  sh.appendRow([name, user, now, json]);
  return listTemplates();
}

function deleteTemplate(name) {
  const sh = getSS_().getSheetByName('Templates');
  const data = rows_(sh);
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === name) sh.deleteRow(i + 2);
  }
  return listTemplates();
}

/* ---------- PDF conversion (uses Google's built-in HTML→PDF converter) ---------- */
function makePdf(html, filename) {
  const blob = Utilities.newBlob(html, 'text/html', (filename || 'proposal') + '.html')
    .getAs('application/pdf');
  return Utilities.base64Encode(blob.getBytes());
}

/* ---------- per-user defaults (sender name/email/logo) ---------- */
function getMyDefaults() {
  const sh = getSS_().getSheetByName('Settings');
  const user = getUser();
  const row = rows_(sh).find(r => r[0] === user);
  return row ? row[1] : null;
}

function saveMyDefaults(json) {
  const sh = getSS_().getSheetByName('Settings');
  const user = getUser();
  const data = rows_(sh);
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === user) {
      sh.getRange(i + 2, 2).setValue(json);
      return true;
    }
  }
  sh.appendRow([user, json]);
  return true;
}
