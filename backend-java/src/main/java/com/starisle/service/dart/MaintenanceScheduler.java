package com.starisle.service.dart;

import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;

@Component
public class MaintenanceScheduler {
    private final MemoryStorageService storageService;
    private final TaskScheduler taskScheduler;
    
    private ScheduledFuture<?> maintenanceTask;
    
    private static final Map<String, Integer> DEFAULT_TIME_WINDOWS = Map.of(
        "startHour", 22,
        "startMinute", 0,
        "endHour", 6,
        "endMinute", 0
    );

    public MaintenanceScheduler() {
        this.storageService = MemoryStorageService.getInstance();
        this.taskScheduler = createTaskScheduler();
    }

    private TaskScheduler createTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("maintenance-");
        scheduler.setDaemon(true);
        scheduler.initialize();
        return scheduler;
    }

    public void initialize() {
        scheduleMaintenance();
    }

    public void scheduleMaintenance() {
        cancelMaintenance();

        LocalDateTime nextExecutionTime = calculateNextExecutionTime();
        
        maintenanceTask = taskScheduler.scheduleAtFixedRate(
            this::performMaintenance,
            nextExecutionTime.toInstant(ZoneId.systemDefault().getRules().getOffset(nextExecutionTime)),
            Duration.ofHours(24)
        );
    }

    private LocalDateTime calculateNextExecutionTime() {
        LocalDateTime now = LocalDateTime.now();
        Map<String, Integer> window = getMaintenanceWindow();
        
        LocalTime targetTime = LocalTime.of(
            window.get("startHour"),
            window.get("startMinute")
        );
        
        LocalDateTime targetDateTime = now.with(targetTime);
        
        if (now.isAfter(targetDateTime)) {
            targetDateTime = targetDateTime.plusDays(1);
        }
        
        return targetDateTime;
    }

    public void setMaintenanceWindow(int startHour, int startMinute, int endHour, int endMinute) {
        Map<String, Integer> window = new HashMap<>();
        window.put("startHour", startHour);
        window.put("startMinute", startMinute);
        window.put("endHour", endHour);
        window.put("endMinute", endMinute);
        
        saveMaintenanceWindow(window);
        scheduleMaintenance();
    }

    private void saveMaintenanceWindow(Map<String, Integer> window) {
        try {
            long now = System.currentTimeMillis();
            
            for (Map.Entry<String, Integer> entry : window.entrySet()) {
                Map<String, Object> data = new HashMap<>();
                data.put("key", "maintenance_" + entry.getKey());
                data.put("value", entry.getValue().toString());
                data.put("updated_at", now);
                storageService.insert("app_settings", data);
            }
        } catch (Exception e) {
        }
    }

    public Map<String, Integer> getMaintenanceWindow() {
        Map<String, Integer> window = new HashMap<>(DEFAULT_TIME_WINDOWS);
        
        try {
            String[] keys = {"startHour", "startMinute", "endHour", "endMinute"};
            
            for (String key : keys) {
                List<Map<String, Object>> result = storageService.query(
                    "app_settings",
                    "key = ?",
                    List.of("maintenance_" + key),
                    null,
                    1
                );
                
                if (!result.isEmpty()) {
                    Object value = result.get(0).get("value");
                    if (value != null) {
                        window.put(key, Integer.parseInt(value.toString()));
                    }
                }
            }
        } catch (Exception e) {
        }
        
        return window;
    }

    public void runManualMaintenance() throws Exception {
        performMaintenance("manual_maintenance", "手动整理：清理过期数据并压缩数据库");
    }

    private void performMaintenance() {
        try {
            performMaintenance("auto_maintenance", "自动整理：清理过期数据并压缩数据库");
        } catch (Exception e) {
        }
    }

    private void performMaintenance(String actionType, String details) throws Exception {
        long startTime = System.currentTimeMillis();
        long initialSize = storageService.getDatabaseSize();

        storageService.clearExpiredData();
        storageService.compactDatabase();

        long endTime = System.currentTimeMillis();
        long finalSize = storageService.getDatabaseSize();
        int storageSaved = (int) (initialSize - finalSize);

        Map<String, Object> record = new HashMap<>();
        record.put("id", LocalDateTime.now().toString());
        record.put("action_type", actionType);
        record.put("details", details);
        record.put("items_processed", 0);
        record.put("storage_saved", storageSaved);
        record.put("started_at", startTime);
        record.put("completed_at", endTime);

        storageService.insert("maintenance_history", record);
    }

    public void cancelMaintenance() {
        if (maintenanceTask != null) {
            maintenanceTask.cancel(false);
            maintenanceTask = null;
        }
    }

    public void pauseMaintenance() {
        cancelMaintenance();
    }

    public void resumeMaintenance() {
        scheduleMaintenance();
    }
}