chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkWiktionary') {
    checkWiktionary(request.lemma, request.lexemeId, sender.tab.id, request.hasBengaliSense);
  } else if (request.action === 'executeReplace') {
    executeReplace(request.lemma, request.lexemeId, sender.tab.id, request.summary, request.newText);
  }
  return true;
});

  // Normalize lemma for Arabic script variations
async function checkWiktionary(lemmaInput, lexemeId, tabId, hasBengaliSense) {
  const inputLemmas = Array.isArray(lemmaInput) ? lemmaInput : [lemmaInput];
  const allVariants = new Set();
  
  inputLemmas.forEach(l => {
    allVariants.add(l);
    const normalized = normalizeLemma(l);
    if (normalized !== l) {
      allVariants.add(normalized);
    }
  });

  const variants = Array.from(allVariants);
  const titles = variants.map(v => encodeURIComponent(v)).join('|');
  const api = `https://bn.wiktionary.org/w/api.php?action=query&prop=revisions&titles=${titles}&rvprop=content&redirects=1&format=json`;
  
  try {
    const response = await fetch(api);
    const data = await response.json();

    const pages = data.query.pages;
    const results = [];

    // Process existing pages
    for (const pageId in pages) {
      const page = pages[pageId];
      if (parseInt(pageId) > 0) {
        if (!page.revisions || !page.revisions[0]) continue;
        
        const content = page.revisions[0]['*'];
        const title = page.title;

        const templateRegex = /\{\{\s*লে\s*\|\s*(L\d+)[^{}]*\}\}/gi;
        let isLinked = false;
        let match;
        while ((match = templateRegex.exec(content)) !== null) {
          if (match[1] === lexemeId) {
            isLinked = true;
            break;
          }
        }

        if (isLinked) continue;

        results.push({
          lemma: title,
          content: content,
          isNew: false
        });
      } else {
        // This title is missing
        const title = page.title;
        const isInterestingScript = /[\u0980-\u09FF\u0600-\u06FF]/.test(title);
        
        if (hasBengaliSense || isInterestingScript) {
          results.push({
            lemma: title,
            content: '',
            isNew: true
          });
        }
      }
    }

    if (results.length > 0) {
      chrome.tabs.sendMessage(tabId, {
        action: 'showUI',
        results: results,
        lexemeId: lexemeId,
        hasBengaliSense: hasBengaliSense
      });
    }
  } catch (error) {
    console.error('Lexeme Linker background error:', error);
  }
}

function normalizeLemma(text) {
  // Strip Arabic harakat (diacritics)
  let norm = text.replace(/[\u064B-\u065F\u0670]/g, "");
  
  return norm;
}

async function executeReplace(lemma, lexemeId, tabId, summary, newText) {
  const apiBase = 'https://bn.wiktionary.org/w/api.php';
  const text = newText || `{{লে|${lexemeId}}}`;
  
  try {
    const tokenUrl = `${apiBase}?action=query&meta=tokens&type=csrf&format=json`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
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
