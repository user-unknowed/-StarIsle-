import type {
  ApiEndpointGroup,
  ApiParameter,
  ApiRequestBody,
  ApiResponseDefinition,
  EndpointSummary,
} from '../types';

// 八个分组的固定顺序
export const GROUP_ORDER = [
  '学生端',
  '教师端',
  '家长端',
  '认证管理',
  '用户管理',
  '数据迁移',
  '密钥管理',
  '系统',
] as const;

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

type OpenAPISpec = Record<string, any>;
type OpenAPIOperation = Record<string, any>;

/**
 * 将 OpenAPI spec 的 paths 按 tag 分组为八个组（顺序见 GROUP_ORDER）。
 * 一个端点有多个 tag 时归入第一个匹配的组。
 * 不匹配任何组的端点归入「其他」组（追加到末尾）。
 */
export function parseSpecGroups(spec: OpenAPISpec | null): ApiEndpointGroup[] {
  if (!spec || !spec.paths) {
    return GROUP_ORDER.map((name) => ({ groupName: name, endpoints: [] }));
  }

  const buckets: Record<string, EndpointSummary[]> = {};
  GROUP_ORDER.forEach((name) => {
    buckets[name] = [];
  });
  const others: EndpointSummary[] = [];

  const paths: Record<string, any> = spec.paths;

  Object.keys(paths).forEach((path) => {
    const pathItem = paths[path];
    if (!pathItem || typeof pathItem !== 'object') return;

    HTTP_METHODS.forEach((method) => {
      const operation: OpenAPIOperation | undefined = pathItem[method];
      if (!operation || typeof operation !== 'object') return;

      const summary: EndpointSummary = {
        method: method.toUpperCase(),
        path,
        tag: Array.isArray(operation.tags) && operation.tags.length > 0 ? operation.tags[0] : '',
        summary: operation.summary || '',
        operationId: operation.operationId,
        description: operation.description,
        parameters: normalizeParameters(operation.parameters),
        requestBody: normalizeRequestBody(operation.requestBody),
        responses: normalizeResponses(operation.responses),
      };

      summary.pathParams = summary.parameters?.filter((p) => p.in === 'path') || [];
      summary.queryParams = summary.parameters?.filter((p) => p.in === 'query') || [];

      const tags: string[] = Array.isArray(operation.tags) ? operation.tags : [];
      const matchedGroup = GROUP_ORDER.find((g) => tags.includes(g));

      if (matchedGroup) {
        buckets[matchedGroup].push(summary);
      } else {
        others.push(summary);
      }
    });
  });

  const groups: ApiEndpointGroup[] = GROUP_ORDER.map((name) => ({
    groupName: name,
    groupDescription: getGroupDescription(spec, name),
    endpoints: buckets[name],
  }));

  if (others.length > 0) {
    groups.push({ groupName: '其他', endpoints: others });
  }

  return groups;
}

function getGroupDescription(spec: OpenAPISpec, name: string): string | undefined {
  const tags = Array.isArray(spec.tags) ? spec.tags : [];
  const found = tags.find((t: any) => t && t.name === name);
  return found ? found.description : undefined;
}

function normalizeParameters(params: any): ApiParameter[] | undefined {
  if (!Array.isArray(params)) return undefined;
  return params
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({
      name: p.name,
      in: p.in,
      required: !!p.required,
      schema: p.schema,
      description: p.description,
    }));
}

function normalizeRequestBody(requestBody: any): ApiRequestBody | undefined {
  if (!requestBody || typeof requestBody !== 'object') return undefined;
  return {
    required: !!requestBody.required,
    content: requestBody.content,
  };
}

function normalizeResponses(responses: any): Record<string, ApiResponseDefinition> | undefined {
  if (!responses || typeof responses !== 'object') return undefined;
  const result: Record<string, ApiResponseDefinition> = {};
  Object.keys(responses).forEach((status) => {
    const resp = responses[status];
    if (!resp) return;
    let schema: any;
    const content = resp.content;
    if (content && content['application/json'] && content['application/json'].schema) {
      schema = content['application/json'].schema;
    }
    result[status] = {
      status,
      description: resp.description || '',
      schema,
    };
  });
  return result;
}

/**
 * 根据 method + path 在 spec 中查找 operation 详情。
 */
export function findOperation(
  spec: OpenAPISpec | null,
  path: string,
  method: string,
): OpenAPIOperation | null {
  if (!spec || !spec.paths || !spec.paths[path]) return null;
  const pathItem = spec.paths[path];
  return pathItem[method.toLowerCase()] || null;
}

/**
 * 解析 $ref 引用（仅支持本地 #/components/schemas/... 引用）。
 */
export function resolveRef(spec: OpenAPISpec | null, ref: string | undefined): any {
  if (!spec || !ref || typeof ref !== 'string' || !ref.startsWith('#/')) return undefined;
  const parts = ref.slice(2).split('/');
  let current: any = spec;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

/**
 * 根据 schema 生成 JSON 模板字符串（用于请求体默认值）。
 */
export function generateBodyTemplate(
  spec: OpenAPISpec | null,
  schema: any,
  depth = 0,
): string {
  const resolved = schema && schema.$ref ? resolveRef(spec, schema.$ref) : schema;
  if (!resolved) return '';

  if (depth > 5) return '{}';

  if (resolved.type === 'object' || resolved.properties) {
    const props = resolved.properties || {};
    const required: string[] = Array.isArray(resolved.required) ? resolved.required : [];
    const keys = Object.keys(props);
    if (keys.length === 0) return '{}';
    const fields = keys.map((key) => {
      const exampleValue = generateValue(spec, props[key], required.includes(key), depth);
      return `  "${key}": ${exampleValue}`;
    });
    return `{\n${fields.join(',\n')}\n}`;
  }

  if (resolved.type === 'array') {
    const item = generateValue(spec, resolved.items, false, depth);
    return `[\n  ${item}\n]`;
  }

  return generateValue(spec, resolved, false, depth);
}

function generateValue(
  spec: OpenAPISpec | null,
  schema: any,
  required: boolean,
  depth: number,
): string {
  if (!schema) return required ? '""' : 'null';
  const resolved = schema.$ref ? resolveRef(spec, schema.$ref) : schema;
  if (!resolved) return required ? '""' : 'null';

  if (resolved.example !== undefined) {
    return JSON.stringify(resolved.example);
  }

  if (resolved.default !== undefined) {
    return JSON.stringify(resolved.default);
  }

  switch (resolved.type) {
    case 'string':
      return resolved.enum && resolved.enum.length > 0
        ? JSON.stringify(resolved.enum[0])
        : '""';
    case 'integer':
    case 'number':
      return '0';
    case 'boolean':
      return 'false';
    case 'array':
      return '[]';
    case 'object':
      return generateBodyTemplate(spec, resolved, depth + 1);
    default:
      return required ? '""' : 'null';
  }
}
