// cloudfunctions/shared/collectionNames.js
// 15 个集合名常量，所有云函数和工具统一从此处引用
var COLLECTIONS = {
  users: 'users',
  classes: 'classes',
  bindings: 'bindings',
  images: 'images',
  tasks: 'tasks',
  feedbacks: 'feedbacks',
  anonymized_records: 'anonymized_records',
  export_logs: 'export_logs',
  status_snapshots: 'status_snapshots',
  archive_logs: 'archive_logs',
  teacher_approvals: 'teacher_approvals',
  ai_quality_metrics: 'ai_quality_metrics',
  retry_queue: 'retry_queue',
  audit_logs: 'audit_logs'
};

module.exports = COLLECTIONS;
