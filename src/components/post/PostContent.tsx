'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
  const [copiedMap, setCopiedMap] = useState<Map<number, boolean>>(new Map());

  const handleCopy = useCallback((index: number, codeText: string) => {
    navigator.clipboard.writeText(codeText).catch(() => {});
    setCopiedMap(prev => {
      const next = new Map(prev);
      next.set(index, true);
      return next;
    });
    setTimeout(() => {
      setCopiedMap(prev => {
        const next = new Map(prev);
        next.set(index, false);
        return next;
      });
    }, 2000);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const pres = containerRef.current.querySelectorAll('pre:not(.enhanced)');
    pres.forEach((pre, index) => {
      const codeEl = pre.querySelector('code');
      if (!codeEl) return;

      const langClass = codeEl.className.match(/language-(\w+)/);
      const lang = langClass ? langClass[1] : 'plaintext';
      const langLabel = CODE_LANGUAGES[lang] || 'Plain Text';
      const codeText = codeEl.textContent || '';

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      wrapper.dataset.index = String(index);

      // Create header
      const header = document.createElement('div');
      header.className = 'code-block-header';

      const langLabelEl = document.createElement('div');
      langLabelEl.className = 'code-lang-label';
      langLabelEl.innerHTML = `<span class="code-lang-dot"></span>${langLabel}`;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'code-copy-btn';
      copyBtn.dataset.index = String(index);
      copyBtn.innerHTML = `
        <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span class="copy-text">คัดลอก</span>
      `;

      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCopy(index, codeText);
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
  }, [html, handleCopy]);

  // Update copy button states reactively
  useEffect(() => {
    if (!containerRef.current) return;
    copiedMap.forEach((isCopied, index) => {
      const btn = containerRef.current?.querySelector(`.code-copy-btn[data-index="${index}"]`);
      if (!btn) return;
      const copyText = btn.querySelector('.copy-text');
      const icon = btn.querySelector('.copy-icon');

      if (isCopied) {
        btn.classList.add('copied');
        if (copyText) copyText.textContent = 'แล้ว';
        if (icon) icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
      } else {
        btn.classList.remove('copied');
        if (copyText) copyText.textContent = 'คัดลอก';
        if (icon) icon.innerHTML = '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
      }
    });
  }, [copiedMap]);

  return (
    <div
      ref={containerRef}
      className="post-content prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed mb-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
