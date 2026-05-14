import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export function ArticleBody({ content }: { content: string }) {
  let firstParagraphSeen = false;
  return (
    <div className="prose-folio">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
          p: ({ children, ...props }) => {
            const isFirst = !firstParagraphSeen;
            if (isFirst) firstParagraphSeen = true;
            return (
              <p {...props} className={isFirst ? "dropcap" : undefined}>
                {children}
              </p>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
