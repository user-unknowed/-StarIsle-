package com.starisle.service.dart;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 存储监控器
 * 定期采集数据库大小、记录统计与维护历史，
 * 通过监听器模式向订阅者推送存储状态变化，用于运维监控与容量预警。
 */
public class StorageMonitor {
    /** 底层内存存储服务，提供数据查询与统计能力 */
    private final MemoryStorageService storageService;

    /** 定时检查调度器，负责周期性触发状态更新 */
    private Timer checkTimer;

    /** 状态变更监听器列表，使用写时复制保证并发安全 */
    private final List<StorageStatusListener> listeners = new CopyOnWriteArrayList<>();

    /**
     * 构造方法
     * 初始化内存存储服务实例。
     */
    public StorageMonitor() {
        this.storageService = MemoryStorageService.getInstance();
    }

    /**
     * 启动监控
     * 以默认 5 分钟为间隔开始周期性监控存储状态。
     */
    public void startMonitoring() {
        startMonitoring(Duration.ofMinutes(5));
    }

    /**
     * 启动监控
     * 按指定间隔周期性更新存储状态，并通知监听器。
     * 若已有定时任务在运行，先取消旧任务再创建新任务，避免重复调度。
     *
     * @param checkInterval 检查间隔时长
     */
    public void startMonitoring(Duration checkInterval) {
        try {
            updateStatus();
        } catch (Exception e) {
            notifyError(e);
        }

        if (checkTimer != null) {
            checkTimer.cancel();
        }

        checkTimer = new Timer(true);
        checkTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                try {
                    updateStatus();
                } catch (Exception e) {
                    notifyError(e);
                }
            }
        }, 0, checkInterval.toMillis());
    }

    /**
     * 停止监控
     * 取消定时任务并释放调度器资源。
     */
    public void stopMonitoring() {
        if (checkTimer != null) {
            checkTimer.cancel();
            checkTimer = null;
        }
    }

    /**
     * 更新存储状态
     * 采集数据库大小、存储统计与最近的维护历史，封装为状态对象后通知监听器。
     *
     * @throws Exception 当查询存储数据失败时抛出
     */
    private void updateStatus() throws Exception {
        long dbSize = storageService.getDatabaseSize();
        Map<String, Integer> stats = storageService.getStorageStats();
        List<Map<String, Object>> history = storageService.query(
            "maintenance_history",
            null, null,
            "started_at DESC",
            10
        );

        List<MaintenanceRecord> maintenanceRecords = new ArrayList<>();
        for (Map<String, Object> item : history) {
            maintenanceRecords.add(MaintenanceRecord.fromMap(item));
        }

        StorageStatus status = new StorageStatus(dbSize, stats, maintenanceRecords);
        notifyListeners(status);
    }

    /**
     * 获取当前存储状态
     * 立即采集一次数据库大小、记录统计与维护历史，封装为状态对象返回。
     *
     * @return 当前存储状态快照
     * @throws Exception 当查询存储数据失败时抛出
     */
    public StorageStatus getCurrentStatus() throws Exception {
        long dbSize = storageService.getDatabaseSize();
        Map<String, Integer> stats = storageService.getStorageStats();
        List<Map<String, Object>> history = storageService.query(
            "maintenance_history",
            null, null,
            "started_at DESC",
            10
        );

        List<MaintenanceRecord> maintenanceRecords = new ArrayList<>();
        for (Map<String, Object> item : history) {
            maintenanceRecords.add(MaintenanceRecord.fromMap(item));
        }

        return new StorageStatus(dbSize, stats, maintenanceRecords);
    }

    /**
     * 获取维护历史
     * 默认返回最近 20 条维护记录。
     *
     * @return 维护记录列表
     * @throws Exception 当查询失败时抛出
     */
    public List<MaintenanceRecord> getMaintenanceHistory() throws Exception {
        return getMaintenanceHistory(20);
    }

    /**
     * 获取维护历史
     * 按开始时间倒序返回指定数量的维护记录。
     *
     * @param limit 返回记录的最大数量
     * @return 维护记录列表
     * @throws Exception 当查询失败时抛出
     */
    public List<MaintenanceRecord> getMaintenanceHistory(int limit) throws Exception {
        List<Map<String, Object>> history = storageService.query(
            "maintenance_history",
            null, null,
            "started_at DESC",
            limit
        );

        List<MaintenanceRecord> records = new ArrayList<>();
        for (Map<String, Object> item : history) {
            records.add(MaintenanceRecord.fromMap(item));
        }

        return records;
    }

    /**
     * 格式化字节大小
     * 根据字节数量自适应转换为 B、KB 或 MB 的可读字符串。
     *
     * @param bytes 字节大小
     * @return 格式化后的可读字符串
     */
    public String formatSize(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }
        if (bytes < 1024 * 1024) {
            return String.format("%.2f KB", bytes / 1024.0);
        }
        return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
    }

    /**
     * 添加状态监听器
     *
     * @param listener 待添加的监听器
     */
    public void addListener(StorageStatusListener listener) {
        listeners.add(listener);
    }

    /**
     * 移除状态监听器
     *
     * @param listener 待移除的监听器
     */
    public void removeListener(StorageStatusListener listener) {
        listeners.remove(listener);
    }

    /**
     * 通知所有监听器状态更新
     * 单个监听器抛出异常不会影响其他监听器接收通知。
     *
     * @param status 最新的存储状态
     */
    private void notifyListeners(StorageStatus status) {
        for (StorageStatusListener listener : listeners) {
            try {
                listener.onStatusUpdate(status);
            } catch (Exception e) {
                // 忽略监听器异常，避免影响其他监听器
            }
        }
    }

    /**
     * 通知所有监听器发生错误
     *
     * @param e 采集过程中抛出的异常
     */
    private void notifyError(Exception e) {
        for (StorageStatusListener listener : listeners) {
            try {
                listener.onError(e);
            } catch (Exception ex) {
                // 忽略监听器异常，避免影响其他监听器
            }
        }
    }

    /**
     * 存储状态监听器接口
     * 订阅者实现该接口以接收存储状态更新与错误通知。
     */
    public interface StorageStatusListener {
        /**
         * 状态更新回调
         *
         * @param status 最新的存储状态
         */
        void onStatusUpdate(StorageStatus status);

        /**
         * 错误回调
         *
         * @param e 采集过程中抛出的异常
         */
        void onError(Exception e);
    }

    /**
     * 存储状态快照
     * 封装某一时刻的数据库大小、记录统计与维护历史，作为不可变值对象传递。
     */
    public static class StorageStatus {
        /** 数据库占用字节大小 */
        private final long databaseSize;
        /** 各表的记录数量统计 */
        private final Map<String, Integer> recordCounts;
        /** 最近维护历史记录 */
        private final List<MaintenanceRecord> maintenanceHistory;

        /**
         * 构造方法
         *
         * @param databaseSize       数据库字节大小
         * @param recordCounts       记录数量统计
         * @param maintenanceHistory 维护历史记录
         */
        public StorageStatus(long databaseSize, Map<String, Integer> recordCounts,
                            List<MaintenanceRecord> maintenanceHistory) {
            this.databaseSize = databaseSize;
            this.recordCounts = recordCounts;
            this.maintenanceHistory = maintenanceHistory;
        }

        /** @return 数据库字节大小 */
        public long getDatabaseSize() { return databaseSize; }
        /** @return 各表记录数量统计 */
        public Map<String, Integer> getRecordCounts() { return recordCounts; }
        /** @return 最近维护历史记录 */
        public List<MaintenanceRecord> getMaintenanceHistory() { return maintenanceHistory; }
    }

    /**
     * 维护记录
     * 描述一次维护操作的类型、详情、处理数量、节省空间及起止时间，
     * 提供从存储 Map 反序列化与时长、标签计算的能力。
     */
    public static class MaintenanceRecord {
        /** 记录唯一标识 */
        private final String id;
        /** 维护动作类型，如 auto_maintenance、data_cleanup */
        private final String actionType;
        /** 维护详情描述 */
        private final String details;
        /** 本次处理的数据条数 */
        private final int itemsProcessed;
        /** 本次节省的存储空间（字节） */
        private final int storageSaved;
        /** 维护开始时间 */
        private final LocalDateTime startedAt;
        /** 维护完成时间，可能为空表示仍在进行中 */
        private final LocalDateTime completedAt;

        /**
         * 构造方法
         *
         * @param id             记录标识
         * @param actionType     动作类型
         * @param details        详情描述
         * @param itemsProcessed 处理条数
         * @param storageSaved   节省字节数
         * @param startedAt      开始时间
         * @param completedAt    完成时间
         */
        public MaintenanceRecord(String id, String actionType, String details,
                                int itemsProcessed, int storageSaved,
                                LocalDateTime startedAt, LocalDateTime completedAt) {
            this.id = id;
            this.actionType = actionType;
            this.details = details;
            this.itemsProcessed = itemsProcessed;
            this.storageSaved = storageSaved;
            this.startedAt = startedAt;
            this.completedAt = completedAt;
        }

        /**
         * 从存储 Map 反序列化构造维护记录
         * 容错处理缺失字段，将毫秒时间戳转换为本地时间。
         *
         * @param map 包含维护字段的 Map
         * @return 反序列化后的维护记录
         */
        public static MaintenanceRecord fromMap(Map<String, Object> map) {
            String id = map.get("id") != null ? map.get("id").toString() : "";
            String actionType = map.get("action_type") != null ? map.get("action_type").toString() : "";
            String details = map.get("details") != null ? map.get("details").toString() : "";
            int itemsProcessed = map.get("items_processed") != null ? ((Number) map.get("items_processed")).intValue() : 0;
            int storageSaved = map.get("storage_saved") != null ? ((Number) map.get("storage_saved")).intValue() : 0;

            long startedAtMillis = map.get("started_at") != null ? ((Number) map.get("started_at")).longValue() : 0;
            LocalDateTime startedAt = LocalDateTime.ofInstant(
                java.time.Instant.ofEpochMilli(startedAtMillis),
                ZoneId.systemDefault()
            );

            LocalDateTime completedAt = null;
            if (map.get("completed_at") != null) {
                long completedAtMillis = ((Number) map.get("completed_at")).longValue();
                completedAt = LocalDateTime.ofInstant(
                    java.time.Instant.ofEpochMilli(completedAtMillis),
                    ZoneId.systemDefault()
                );
            }

            return new MaintenanceRecord(id, actionType, details, itemsProcessed,
                                        storageSaved, startedAt, completedAt);
        }

        /**
         * 计算维护耗时
         * 若未完成返回"进行中"，否则根据时长自适应返回秒、分钟或小时。
         *
         * @return 可读的耗时描述
         */
        public String getDuration() {
            if (completedAt == null) {
                return "进行中";
            }
            Duration diff = Duration.between(startedAt, completedAt);
            if (diff.getSeconds() < 60) {
                return diff.getSeconds() + "秒";
            }
            if (diff.toMinutes() < 60) {
                return diff.toMinutes() + "分钟";
            }
            return diff.toHours() + "小时";
        }

        /**
         * 获取动作类型的中文名称
         * 将动作类型编码映射为可读标签，未知类型原样返回。
         *
         * @return 动作类型中文名称
         */
        public String getActionTypeLabel() {
            switch (actionType) {
                case "auto_maintenance":
                    return "自动整理";
                case "manual_maintenance":
                    return "手动整理";
                case "data_cleanup":
                    return "数据清理";
                case "compaction":
                    return "数据库压缩";
                default:
                    return actionType;
            }
        }

        /** @return 记录标识 */
        public String getId() { return id; }
        /** @return 动作类型 */
        public String getActionType() { return actionType; }
        /** @return 详情描述 */
        public String getDetails() { return details; }
        /** @return 处理条数 */
        public int getItemsProcessed() { return itemsProcessed; }
        /** @return 节省字节数 */
        public int getStorageSaved() { return storageSaved; }
        /** @return 开始时间 */
        public LocalDateTime getStartedAt() { return startedAt; }
        /** @return 完成时间 */
        public LocalDateTime getCompletedAt() { return completedAt; }
    }
}
