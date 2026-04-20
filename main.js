import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

// --- State Management ---
let tabs = [];
let activeTabId = null;

// DOM Elements
const editor = document.getElementById('editor');
const tabBar = document.getElementById('tabBar');
const btnNewTab = document.getElementById('btnNewTab');
const btnNew = document.getElementById('btnNew');
const fontFamilySelect = document.getElementById('fontFamilySelect');
const fontSizeSelect = document.getElementById('fontSizeSelect');

// --- Initialization ---
function init() {
  // Start clock
  setInterval(updateClock, 1000);
  updateClock();

  // Load tabs from localStorage or create first tab
  const savedTabs = localStorage.getItem('notePro_tabs');
  if (savedTabs) {
    try {
      tabs = JSON.parse(savedTabs);
      if (tabs.length === 0) createNewTab();
      else switchTab(tabs[0].id);
    } catch {
      createNewTab();
    }
  } else {
    createNewTab();
  }
}

function updateClock() {
  const clockEL = document.getElementById('clockDisplay');
  if (clockEL) {
    const now = new Date();
    clockEL.textContent = now.toLocaleTimeString();
  }
}

// --- Tabs Management ---
function generateId() {
  return 'tab_' + Math.random().toString(36).substr(2, 9);
}

function createNewTab(title = 'Untitled', content = '') {
  const id = generateId();
  const newTab = {
    id,
    title,
    content,
    fontFamily: fontFamilySelect.value,
    fontSize: fontSizeSelect.value
  };
  tabs.push(newTab);
  saveState();
  switchTab(id);
}

function switchTab(id) {
  // Save current tab content before switching
  if (activeTabId) {
    const activeIndex = tabs.findIndex(t => t.id === activeTabId);
    if (activeIndex > -1) {
      tabs[activeIndex].content = editor.innerHTML;
      tabs[activeIndex].fontFamily = fontFamilySelect.value;
      tabs[activeIndex].fontSize = fontSizeSelect.value;
    }
  }

  activeTabId = id;
  const currentTab = tabs.find(t => t.id === id);
  if (currentTab) {
    editor.innerHTML = currentTab.content || '';
    fontFamilySelect.value = currentTab.fontFamily || "'Inter', sans-serif";
    fontSizeSelect.value = currentTab.fontSize || "16px";
    applyFormatting();
  }
  
  renderTabs();
  saveState();
}

function closeTab(id, e) {
  e.stopPropagation();
  tabs = tabs.filter(t => t.id !== id);
  
  if (tabs.length === 0) {
    createNewTab();
  } else if (activeTabId === id) {
    switchTab(tabs[tabs.length - 1].id);
  } else {
    renderTabs();
  }
  saveState();
}

function renderTabs() {
  // Remove all existing tabs except the plus button
  const existingTabs = tabBar.querySelectorAll('.tab-btn:not(#btnNewTab)');
  existingTabs.forEach(t => t.remove());

  // Create tab elements
  tabs.forEach(tab => {
    const btn = document.createElement('div');
    btn.className = `tab-btn group ${tab.id === activeTabId ? 'active' : ''}`;
    
    // Extract text-only title if possible, or use untitled
    let displayTitle = tab.title;
    if (displayTitle === 'Untitled') {
       const textObj = document.createElement('div');
       textObj.innerHTML = tab.content;
       const rawText = textObj.textContent.trim();
       if (rawText.length > 0) {
         displayTitle = rawText.substring(0, 15) + (rawText.length > 15 ? '...' : '');
       }
    }

    btn.innerHTML = `
      <div class="truncate select-none">${displayTitle}</div>
      <button class="tab-close opacity-0 group-hover:opacity-100"><i class="fas fa-times text-[10px]"></i></button>
    `;
    
    // Handlers
    btn.addEventListener('click', () => switchTab(tab.id));
    btn.querySelector('.tab-close').addEventListener('click', (e) => closeTab(tab.id, e));
    
    tabBar.insertBefore(btn, btnNewTab);
  });
}

function saveState() {
  if (activeTabId) {
    const activeIndex = tabs.findIndex(t => t.id === activeTabId);
    if (activeIndex > -1) {
      tabs[activeIndex].content = editor.innerHTML;
    }
  }
  localStorage.setItem('notePro_tabs', JSON.stringify(tabs));
}

// Editor listener
editor.addEventListener('input', () => {
  renderTabs(); // dynamically update titles
  saveState();
});

// Settings & Actions
fontFamilySelect.addEventListener('change', () => {
  applyFormatting();
  saveState();
});
fontSizeSelect.addEventListener('change', () => {
  applyFormatting();
  saveState();
});

function applyFormatting() {
  editor.style.fontFamily = fontFamilySelect.value;
  editor.style.fontSize = fontSizeSelect.value;
}

// Toolbar Handlers
btnNewTab.addEventListener('click', () => createNewTab());
btnNew.addEventListener('click', () => createNewTab());

document.getElementById('btnCut').addEventListener('click', () => {
  document.execCommand('cut');
  editor.focus();
});
document.getElementById('btnCopy').addEventListener('click', () => {
  document.execCommand('copy');
  editor.focus();
});
document.getElementById('btnPaste').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    document.execCommand('insertText', false, text);
  } catch(e) {
    console.error('Failed to paste: ', e);
    document.execCommand('paste');
  }
  editor.focus();
});

// File Management
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    createNewTab(file.name, ev.target.result);
  };
  reader.readAsText(file);
  e.target.value = ''; // reset
});

document.getElementById('btnSaveTxt').addEventListener('click', () => {
  const text = editor.innerText || editor.textContent;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "note-pro.txt");
});

document.getElementById('btnSaveDocx').addEventListener('click', () => {
  const text = editor.innerText || editor.textContent;
  const lines = text.split('\n');
  
  const docParagraphs = lines.map(line => {
    return new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: fontFamilySelect.options[fontFamilySelect.selectedIndex].text,
          size: parseInt(fontSizeSelect.value) * 2 // half-points in docx
        })
      ]
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: docParagraphs,
    }]
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, "note-pro.docx");
  });
});

document.getElementById('btnPrint').addEventListener('click', () => {
  window.print();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'n') {
      e.preventDefault();
      createNewTab();
    }
    if (e.key === 'p') {
      e.preventDefault();
      window.print();
    }
  }
});

// Run
init();
