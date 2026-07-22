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

public class StorageMonitor {
    private final MemoryStorageService storageService;
    
    private Timer checkTimer;
    
    private final List<StorageStatusListener> listeners = new CopyOnWriteArrayList<>();

    public StorageMonitor() {
        this.storageService = MemoryStorageService.getInstance();
    }

    public void startMonitoring() {
        startMonitoring(Duration.ofMinutes(5));
    }

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

    public void stopMonitoring() {
        if (checkTimer != null) {
            checkTimer.cancel();
            checkTimer = null;
        }
    }

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

    public List<MaintenanceRecord> getMaintenanceHistory() throws Exception {
        return getMaintenanceHistory(20);
    }

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

    public String formatSize(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }
        if (bytes < 1024 * 1024) {
            return String.format("%.2f KB", bytes / 1024.0);
        }
        return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
    }

    public void addListener(StorageStatusListener listener) {
        listeners.add(listener);
    }

    public void removeListener(StorageStatusListener listener) {
        listeners.remove(listener);
    }

    private void notifyListeners(StorageStatus status) {
        for (StorageStatusListener listener : listeners) {
            try {
                listener.onStatusUpdate(status);
            } catch (Exception e) {
            }
        }
    }

    private void notifyError(Exception e) {
        for (StorageStatusListener listener : listeners) {
            try {
                listener.onError(e);
            } catch (Exception ex) {
            }
        }
    }

    public interface StorageStatusListener {
        void onStatusUpdate(StorageStatus status);
        void onError(Exception e);
    }

    public static class StorageStatus {
        private final long databaseSize;
        private final Map<String, Integer> recordCounts;
        private final List<MaintenanceRecord> maintenanceHistory;

        public StorageStatus(long databaseSize, Map<String, Integer> recordCounts,
                            List<MaintenanceRecord> maintenanceHistory) {
            this.databaseSize = databaseSize;
            this.recordCounts = recordCounts;
            this.maintenanceHistory = maintenanceHistory;
        }

        public long getDatabaseSize() { return databaseSize; }
        public Map<String, Integer> getRecordCounts() { return recordCounts; }
        public List<MaintenanceRecord> getMaintenanceHistory() { return maintenanceHistory; }
    }

    public static class MaintenanceRecord {
        private final String id;
        private final String actionType;
        private final String details;
        private final int itemsProcessed;
        private final int storageSaved;
        private final LocalDateTime startedAt;
        private final LocalDateTime completedAt;

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

        public String getId() { return id; }
        public String getActionType() { return actionType; }
        public String getDetails() { return details; }
        public int getItemsProcessed() { return itemsProcessed; }
        public int getStorageSaved() { return storageSaved; }
        public LocalDateTime getStartedAt() { return startedAt; }
        public LocalDateTime getCompletedAt() { return completedAt; }
    }
}