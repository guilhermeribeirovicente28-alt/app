import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Markdown = ({ text, streaming, testid }) => (
  <div className={`md ${streaming ? "blink-caret" : ""}`} data-testid={testid}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  </div>
);
