/**
 * Markdown rendering configuration for react-markdown.
 */
import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Custom components for react-markdown.
 * Provides syntax-highlighted code blocks and styled elements.
 */
export const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : null;
    const codeString = String(children).replace(/\n$/, '');

    if (!inline && language) {
      return (
        <div className="relative group my-3">
          <div className="flex items-center justify-between bg-gray-800 text-gray-400 text-xs px-4 py-1.5 rounded-t-lg">
            <span>{language}</span>
            <button
              onClick={() => navigator.clipboard.writeText(codeString)}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-200"
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={language}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: '0.5rem',
              borderBottomRightRadius: '0.5rem',
            }}
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    if (!inline && !language) {
      return (
        <div className="relative group my-3">
          <SyntaxHighlighter
            style={oneDark}
            PreTag="div"
            customStyle={{ borderRadius: '0.5rem' }}
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    return (
      <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm" {...props}>
        {children}
      </code>
    );
  },
};
