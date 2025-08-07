function extractPageData() {
  const data = {
    url: window.location.href,
    title: document.title,
    text: document.body.innerText.substring(0, 50000), // Limit to prevent memory issues
    html: '', // Don't store full HTML to save memory
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
  let imageCount = 0;
  images.forEach(img => {
    if (img.src && imageCount < 100) { // Limit images to prevent memory issues
      data.images.push({
        src: img.src,
        alt: img.alt || '',
        title: img.title || '',
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0
      });
      imageCount++;
    }
  });

  const links = document.querySelectorAll('a[href]');
  let linkCount = 0;
  links.forEach(link => {
    if (linkCount < 200) { // Limit links to prevent memory issues
      const linkText = link.textContent.trim();
      if (linkText) { // Only include links with text
        data.links.push({
          href: link.href,
          text: linkText.substring(0, 200), // Limit link text length
          title: link.title || ''
        });
        linkCount++;
      }
    }
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