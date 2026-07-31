import { useState, type ReactNode } from 'react';

interface JsonViewProps {
  data: unknown;
  /** 超过该字符数时截断显示（仅对字符串化后的整体生效） */
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 50000;

/**
 * 简易 JSON 语法高亮组件，递归渲染对象/数组/基本类型。
 * 不引入额外依赖，用 span + className 着色。
 * 对超大响应截断显示。
 */
function JsonView({ data, maxChars = DEFAULT_MAX_CHARS }: JsonViewProps) {
  const serialized = safeStringify(data);
  const truncated = serialized.length > maxChars;

  if (truncated) {
    return (
      <div className="json-view json-view-truncated">
        <pre className="json-pre">{serialized.slice(0, maxChars)}</pre>
        <div className="json-truncate-tip">
          ⚠️ 响应过大（{serialized.length.toLocaleString()} 字符），已截断显示前 {maxChars.toLocaleString()} 字符
        </div>
      </div>
    );
  }

  return (
    <div className="json-view">
      <pre className="json-pre">{renderNode(data, '')}</pre>
    </div>
  );
}

function renderNode(value: unknown, indent: string): ReactNode {
  if (value === null) {
    return <span className="json-null">null</span>;
  }

  if (typeof value === 'boolean') {
    return <span className="json-boolean">{String(value)}</span>;
  }

  if (typeof value === 'number') {
    return <span className="json-number">{String(value)}</span>;
  }

  if (typeof value === 'string') {
    return <span className="json-string">{JSON.stringify(value)}</span>;
  }

  if (Array.isArray(value)) {
    return renderArray(value, indent);
  }

  if (typeof value === 'object') {
    return renderObject(value as Record<string, unknown>, indent);
  }

  return <span>{String(value)}</span>;
}

function renderArray(arr: unknown[], indent: string): ReactNode {
  if (arr.length === 0) {
    return <span>[]</span>;
  }
  const childIndent = indent + '  ';
  const items = arr.map((item, index) => (
    <div key={index}>
      {childIndent}
      {renderNode(item, childIndent)}
      {index < arr.length - 1 ? ',' : ''}
    </div>
  ));
  return (
    <span>
      [<br />
      {items}
      {indent}]
    </span>
  );
}

function renderObject(obj: Record<string, unknown>, indent: string): ReactNode {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return <span>{'{}'}</span>;
  }
  const childIndent = indent + '  ';
  const entries = keys.map((key, index) => (
    <div key={key}>
      {childIndent}
      <span className="json-key">{JSON.stringify(key)}</span>: {renderNode(obj[key], childIndent)}
      {index < keys.length - 1 ? ',' : ''}
    </div>
  ));
  return (
    <span>
      {'{'}<br />
      {entries}
      {indent}{'}'}
    </span>
  );
}

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/** 备用：折叠式 JSON 树（当前未启用，保留以便后续扩展） */
export function JsonViewCollapsible({ data }: { data: unknown }) {
  return <JsonViewCollapsibleInner value={data} name="" />;
}

function JsonViewCollapsibleInner({ value, name }: { value: unknown; name: string }) {
  const [open, setOpen] = useState(true);
  const isContainer =
    value !== null && typeof value === 'object' && Object.keys(value as object).length > 0;

  const label = name ? <span className="json-key">{JSON.stringify(name)}</span> : null;

  if (!isContainer) {
    return (
      <div className="json-tree-leaf">
        {label ? <>{label}: </> : null}
        {renderNode(value, '')}
      </div>
    );
  }

  return (
    <div className="json-tree-node">
      <span className="json-toggle" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} {label}
        {label ? ': ' : ''}
        {Array.isArray(value) ? '[' : '{'}
      </span>
      {open && (
        <div className="json-tree-children" style={{ marginLeft: 16 }}>
          {Object.entries(value as object).map(([k, v]) => (
            <JsonViewCollapsibleInner key={k} value={v} name={k} />
          ))}
        </div>
      )}
      <div>{Array.isArray(value) ? ']' : '}'}</div>
    </div>
  );
}

export default JsonView;
