function extractPageData() {
  const data = {
    url: window.location.href,
    title: document.title,
    text: document.body.innerText,
    html: document.documentElement.outerHTML,
    images: [],
    links: [],
    metadata: {
      description: '',
      keywords: '',
      author: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: ''
    }
  };

  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.src) {
      data.images.push({
        src: img.src,
        alt: img.alt || '',
        title: img.title || '',
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    }
  });

  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    data.links.push({
      href: link.href,
      text: link.textContent.trim(),
      title: link.title || ''
    });
  });

  const metaTags = document.querySelectorAll('meta');
  metaTags.forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property');
    const content = meta.getAttribute('content');
    
    if (name && content) {
      switch (name.toLowerCase()) {
        case 'description':
          data.metadata.description = content;
          break;
        case 'keywords':
          data.metadata.keywords = content;
          break;
        case 'author':
          data.metadata.author = content;
          break;
        case 'og:title':
          data.metadata.ogTitle = content;
          break;
        case 'og:description':
          data.metadata.ogDescription = content;
          break;
        case 'og:image':
          data.metadata.ogImage = content;
          break;
      }
    }
  });

  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPageData') {
    try {
      const pageData = extractPageData();
      sendResponse({ success: true, data: pageData });
    } catch (error) {
      console.error('Error extracting page data:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
});

window.addEventListener('load', () => {
  console.log('AI Browser Copilot content script loaded');
});