(async function() {
  const lexemeId = window.location.href.split(':')[2];

  try {
    const wdData = await fetchEntityData(lexemeId);
    const lemmas = wdData.lemmas;
    if (!lemmas || Object.values(lemmas).length === 0) return;
    
    const primaryLemma = Object.values(lemmas)[0].value;
    const hasBengaliSense = wdData.senses.some(sense => sense.glosses.bn);

    if (!hasBengaliSense) return;
    
    chrome.runtime.sendMessage({
      action: 'checkWiktionary',
      lemma: primaryLemma,
      lexemeId: lexemeId
    });

  } catch (error) {
    console.error('Lexeme Linker error:', error);
  }

  async function fetchEntityData(id) {
    const api = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}&format=json&origin=*`;
    const response = await fetch(api);
    const data = await response.json();
    return data.entities[id];
  }

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'showUI') {
      renderOverlay(request.lemma, request.lexemeId, request.content, request.isNew);
    } else if (request.action === 'editSuccess') {
      updateStatus('Success! Page updated.', 'green');
      setTimeout(() => document.getElementById('lexeme-linker-card')?.remove(), 3000);
    } else if (request.action === 'editError') {
      updateStatus(`Error: ${request.message}`, 'red');
    }
  });

  async function renderOverlay(lemma, lexemeId, content, isNew = false) {
    const previewLength = 800;
    let isTruncated = content.length > previewLength;
    const template = `{{লে|${lexemeId}}}`;
    const displayContent = isNew ? template : (isTruncated ? content.substring(0, previewLength) : content);
    
    const systemDefaultSummary = 'ব্রাউজার এক্সটেনশনের সাহায্যে ' + (isNew 
      ? `উইকিউপাত্ত লেক্সিম ${lexemeId}-এর জন্য একটি নতুন ভুক্তি তৈরি করছি`
      : `উইকিউপাত্ত লেক্সিম ${lexemeId}-এর সাথে সংযোগ তৈরি করছি`);
    
    // Load custom summary from storage
    const storage = await chrome.storage.local.get('customSummary');
    const defaultSummary = storage.customSummary || systemDefaultSummary;

    const overlay = document.createElement('div');
    overlay.id = 'lexeme-linker-card';
    overlay.className = 'lexeme-wikt-overlay';

    const statusMsg = isNew 
      ? `বাংলা উইকিঅভিধানে <strong>${lemma}</strong> নামে কোনো ভুক্তি নেই। আপনি কি এটি তৈরি করতে চান?`
      : `বাংলা উইকিঅভিধানে এই লেক্সিমের মূল লেমার সাথে মিলে যায় এমন একটি ভুক্তি আছে: <strong><a href="https://bn.wiktionary.org/wiki/${encodeURIComponent(lemma)}" target="_blank">${lemma}</a></strong>.`;

    const buttonLabel = isNew ? 'তৈরি করুন' : 'সংরক্ষণ করুন';

    overlay.innerHTML = `
      <div class="ll-header">
        <strong>Lexeme Linker</strong>
        <span class="ll-close">&times;</span>
      </div>
      <div class="ll-content">
        <p>${statusMsg}</p>
        <div class="ll-preview-container">
          <textarea id="ll-wikitext-editor">${escapeHTML(displayContent)}</textarea>
          <div class="ll-editor-tools">
            ${isNew ? '' : '<button id="ll-replace-all" type="button" class="ll-btn-danger">সব মুছুন এবং টেমপ্লেট বসান</button>'}
            <button id="ll-insert-template" type="button">টেমপ্লেট বসান</button>
            <button id="ll-insert-no-heading" type="button">সেকশন হেডিং ছাড়া টেম্পলেট বসান</button>
            ${isTruncated && !isNew ? '<button id="ll-load-full" type="button">সম্পূর্ণ টেক্সট লোড করুন</button>' : ''}
          </div>
        </div>
        <p class="ll-warning">
          <strong>⚠️ সতর্কতা:</strong> ${isNew ? 'ভুক্তিটি তৈরি করার আগে নিশ্চিত করুন যে আপনি সঠিক তথ্য দিচ্ছেন।' : 'এই ভুক্তির টেক্সট সম্পূর্ণভাবে প্রতিস্থাপন করার আগে নিশ্চিত করুন যে, বর্তমানে ভুক্তিতে আছে এমন সব তথ্য (অন্যান্য ভাষার বিষয়বস্তুসহ) এই লেক্সিমে আনা হয়েছে বা আছে।'}
        </p>
        <div class="ll-custom-summary">
          <div class="ll-summary-header">
            <label for="ll-summary-input">সম্পাদনার সারাংশ:</label>
            <div class="ll-summary-actions">
               <span id="ll-save-summary" title="ডিফল্ট হিসেবে সেভ করুন">💾</span>
               <span id="ll-reset-summary" title="মূল ডিফল্টে ফিরে যান">🔄</span>
            </div>
          </div>
          <input type="text" id="ll-summary-input" value="${defaultSummary}">
        </div>
        <div id="ll-status"></div>
        <button id="ll-replace-btn">${buttonLabel}</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('#ll-wikitext-editor');
    const loadFullBtn = overlay.querySelector('#ll-load-full');
    const insertBtn = overlay.querySelector('#ll-insert-template');
    const insertNoHeadingBtn = overlay.querySelector('#ll-insert-no-heading');
    const replaceAllBtn = overlay.querySelector('#ll-replace-all');
    const summaryInput = overlay.querySelector('#ll-summary-input');
    const saveSummaryBtn = overlay.querySelector('#ll-save-summary');
    const resetSummaryBtn = overlay.querySelector('#ll-reset-summary');

    overlay.querySelector('.ll-close').onclick = () => overlay.remove();

    if (loadFullBtn) {
      loadFullBtn.onclick = () => {
        textarea.value = content;
        loadFullBtn.remove();
      };
    }

    insertBtn.onclick = () => {
      const template = `{{লে|${lexemeId}}}`;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      textarea.value = text.substring(0, start) + template + text.substring(end);
      textarea.focus();
      textarea.setSelectionRange(start + template.length, start + template.length);
    };

    insertNoHeadingBtn.onclick = () => {
      const template = `{{লে|${lexemeId}|না}}`;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      textarea.value = text.substring(0, start) + template + text.substring(end);
      textarea.focus();
      textarea.setSelectionRange(start + template.length, start + template.length);
    };

    if (replaceAllBtn) {
      replaceAllBtn.onclick = () => {
        textarea.value = `{{লে|${lexemeId}}}`;
        textarea.focus();
      };
    }

    saveSummaryBtn.onclick = async () => {
      const val = summaryInput.value;
      await chrome.storage.local.set({ customSummary: val });
      updateStatus('ডিফল্ট সারাংশ সফলভাবে সেভ করা হয়েছে।', 'green');
    };

    resetSummaryBtn.onclick = async () => {
      await chrome.storage.local.remove('customSummary');
      summaryInput.value = systemDefaultSummary;
      updateStatus('মূল ডিফল্ট সারাংশে ফিরে আসা হয়েছে।', 'blue');
    };

    overlay.querySelector('#ll-replace-btn').onclick = () => {
      const summary = summaryInput ? summaryInput.value : defaultSummary;
      const newText = textarea.value;
      
      overlay.querySelector('#ll-replace-btn').disabled = true;
      if (summaryInput) summaryInput.disabled = true;
      textarea.disabled = true;
      
      updateStatus('Processing edit...', 'blue');
      chrome.runtime.sendMessage({ 
        action: 'executeReplace', 
        lemma, 
        lexemeId,
        summary: summary,
        newText: newText
      });
    };
  }

  function updateStatus(text, color) {
    const status = document.getElementById('ll-status');
    if (status) {
      status.textContent = text;
      status.style.color = color;
      status.style.marginBottom = '10px';
      status.style.fontWeight = 'bold';
    }
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }
})();
