'use client';

import { useEffect, useRef } from 'react';

const CODE_LANGUAGES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  bash: 'Bash',
  json: 'JSON',
  php: 'PHP',
  plaintext: 'Plain Text',
};

export default function PostContent({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const enhancedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!containerRef.current) return;

    const pres = containerRef.current.querySelectorAll('pre:not(.enhanced)');
    pres.forEach((pre) => {
      const codeEl = pre.querySelector('code');
      if (!codeEl) return;

      const codeText = codeEl.textContent || '';
      // Create a unique ID based on content to prevent re-enhancing
      const blockId = `block-${codeText.length}-${codeText.substring(0, 20).replace(/\s/g, '_')}`;

      if (enhancedRef.current.has(blockId)) return;
      enhancedRef.current.add(blockId);

      const langClass = codeEl.className.match(/language-(\w+)/);
      const lang = langClass ? langClass[1] : 'plaintext';
      const langLabel = CODE_LANGUAGES[lang] || 'Plain Text';

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      // Create header
      const header = document.createElement('div');
      header.className = 'code-block-header';

      const langLabelEl = document.createElement('div');
      langLabelEl.className = 'code-lang-label';
      langLabelEl.innerHTML = `<span class="code-lang-dot"></span>${langLabel}`;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'code-copy-btn';
      copyBtn.innerHTML = `
        <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span class="copy-text">คัดลอก</span>
      `;

      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(codeText).catch(() => {});

        const copyTextEl = copyBtn.querySelector('.copy-text');
        const iconEl = copyBtn.querySelector('.copy-icon');
        if (copyTextEl) copyTextEl.textContent = 'แล้ว';
        if (iconEl) iconEl.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
        copyBtn.classList.add('copied');

        setTimeout(() => {
          if (copyTextEl) copyTextEl.textContent = 'คัดลอก';
          if (iconEl) iconEl.innerHTML = '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
          copyBtn.classList.remove('copied');
        }, 2000);
      });

      header.appendChild(langLabelEl);
      header.appendChild(copyBtn);

      // Replace pre with wrapper
      const parent = pre.parentNode;
      if (parent) {
        parent.replaceChild(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
      }

      pre.classList.add('enhanced');
      (pre as HTMLElement).style.margin = '0';
      (pre as HTMLElement).style.border = 'none';
      (pre as HTMLElement).style.borderRadius = '0';
      (pre as HTMLElement).style.background = 'transparent';
      (pre as HTMLElement).style.padding = '0';
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="post-content prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed mb-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
