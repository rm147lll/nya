let miaoStr = '喵';

function ifNeed(str) {
  if (str == null) return false;
  let s = str.trim();
  if (s.length == 0) return false;
  if (s.indexOf(miaoStr) != -1) return false;
  return true;
}

function jiaMiao(nd) {
  let old = nd.textContent;
  if (!ifNeed(old)) return;
  let new1 = old.replace(/([。！？；：\n])/g, '$1' + miaoStr);
  if (new1 == old) {
    new1 = old + miaoStr;
  }
  if (new1 != old) {
    nd.textContent = new1;
  }
}

function scanSub(root) {
  if (root.nodeType == 1) {
    let tag = root.tagName;
    if (/^SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT$/i.test(tag)) return;
    let rect = root.getBoundingClientRect();
    if (rect.width == 0 && rect.height == 0 && root.textContent.trim().length == 0) return;
  }

  let walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(n) {
        let p = n.parentNode;
        while (p && p != document.body) {
          if (p.nodeType == 1) {
            let tn = p.tagName;
            if (/^SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT$/i.test(tn)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (p.offsetParent == null && p != document.body) {
              return NodeFilter.FILTER_REJECT;
            }
          }
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  let arr = [];
  let node;
  while (node = walker.nextNode()) {
    arr.push(node);
  }
  for (let i = 0; i < arr.length; i++) {
    jiaMiao(arr[i]);
  }
}

let timerId = null;
let pendingSet = new Set();

function laterProcess(root) {
  if (root) pendingSet.add(root);
  if (timerId) return;
  timerId = setTimeout(function() {
    timerId = null;
    let list = Array.from(pendingSet);
    pendingSet.clear();

    if (list.length > 20) {
      scanSub(document.body);
      return;
    }
    for (let i = 0; i < list.length; i++) {
      let r = list[i];
      if (!document.contains(r)) continue;
      scanSub(r);
    }
  }, 80);
}

let chunkSize = 50; 

function firstLoad() {
  let body = document.body;
  let walker = document.createTreeWalker(
    body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(n) {
        let p = n.parentNode;
        while (p && p != body) {
          if (p.nodeType == 1) {
            let tn = p.tagName;
            if (/^SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT$/i.test(tn)) {
              return NodeFilter.FILTER_REJECT;
            }
          }
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  let all = [];
  let nd;
  while (nd = walker.nextNode()) {
    all.push(nd);
  }

  let idx = 0;
  function doChunk() {
    let end = Math.min(idx + chunkSize, all.length);
    for (let i = idx; i < end; i++) {
      jiaMiao(all[i]);
    }
    idx = end;
    if (idx < all.length) {
      requestIdleCallback(doChunk, { timeout: 100 });
    }
  }
  requestIdleCallback(doChunk, { timeout: 50 });
}

let observer = new MutationObserver(function(muts) {
  for (let m of muts) {
    if (m.type == 'childList') {
      for (let added of m.addedNodes) {
        if (added.nodeType == 1) {
          laterProcess(added);
        }
      }
    } else if (m.type == 'characterData') {
      let parent = m.target.parentNode;
      if (parent) laterProcess(parent);
    }
  }
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', function() { firstLoad(); });
} else {
  firstLoad();
}