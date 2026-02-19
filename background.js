chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkWiktionary') {
    checkWiktionary(request.lemma, request.lexemeId, sender.tab.id);
  } else if (request.action === 'executeReplace') {
    executeReplace(request.lemma, request.lexemeId, sender.tab.id, request.summary, request.newText);
  }
  return true;
});

async function checkWiktionary(lemma, lexemeId, tabId) {
  // Normalize lemma for Arabic script variations
  const variants = [lemma];
  const normalized = normalizeLemma(lemma);
  if (normalized !== lemma) {
    variants.push(normalized);
  }

  const titles = variants.map(v => encodeURIComponent(v)).join('|');
  const api = `https://bn.wiktionary.org/w/api.php?action=query&prop=revisions&titles=${titles}&rvprop=content&redirects=1&format=json`;
  
  try {
    const response = await fetch(api);
    const data = await response.json();

    if (!data.query || !data.query.pages) {
      console.log('Lexeme Linker: Unexpected API response', data);
      return;
    }

    const pages = data.query.pages;
    const pageId = Object.keys(pages).find(id => id !== '-1');

    if (!pageId) return;

    const page = pages[pageId];
    const content = page.revisions[0]['*'];
    const title = page.title;

    // Check if the current lexemeId is already linked using the template
    const templateRegex = /\{\{\s*লে\s*\|\s*(L\d+)[^{}]*\}\}/gi;
    let existingIds = [];
    let match;
    while ((match = templateRegex.exec(content)) !== null) {
      existingIds.push(match[1]);
    }

    if (existingIds.includes(lexemeId)) {
      return;
    }
    
    chrome.tabs.sendMessage(tabId, {
      action: 'showUI',
      content: content,
      lemma: title,
      lexemeId: lexemeId
    });

  } catch (error) {
    console.error('Lexeme Linker background error:', error);
  }
}

function normalizeLemma(text) {
  // Strip Arabic harakat (diacritics)
  let norm = text.replace(/[\u064B-\u065F\u0670]/g, "");
  // Normalize Alef variants
  norm = norm.replace(/[أإآ]/g, "ا");
  // Normalize Yeh variants (ي/ى to ی)
  norm = norm.replace(/[يى]/g, "ی");
  // Normalize Kaf variants (ك to ک)
  norm = norm.replace(/ك/g, "ک");
  // Normalize Te Marbuta (ة to ه)
  norm = norm.replace(/ة/g, "ه");
  
  return norm;
}

async function executeReplace(lemma, lexemeId, tabId, summary, newText) {
  const apiBase = 'https://bn.wiktionary.org/w/api.php';
  const text = newText || `{{লে|${lexemeId}}}`;
  
  try {
    const tokenUrl = `${apiBase}?action=query&meta=tokens&type=csrf&format=json`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    
    if (!tokenData.query || !tokenData.query.tokens) {
      throw new Error(`Failed to get edit token: ${JSON.stringify(tokenData)}`);
    }
    
    const editToken = tokenData.query.tokens.csrftoken;

    const editParams = new URLSearchParams({
      action: 'edit',
      title: lemma,
      text: text,
      summary: summary,
      token: editToken,
      format: 'json'
    });

    const editRes = await fetch(apiBase, {
      method: 'POST',
      body: editParams
    });
    const editResult = await editRes.json();

    if (editResult.edit && editResult.edit.result === 'Success') {
      chrome.tabs.sendMessage(tabId, { action: 'editSuccess' });
    } else {
      chrome.tabs.sendMessage(tabId, { action: 'editError', message: JSON.stringify(editResult) });
    }

  } catch (error) {
    console.error('Lexeme Linker edit error:', error);
    chrome.tabs.sendMessage(tabId, { action: 'editError', message: error.message });
  }
}
