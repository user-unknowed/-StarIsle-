package com.starisle.service.dart;

import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;

/**
 * 维护调度器
 * 管理数据库定期维护任务，支持自动/手动触发数据清理与压缩，
 * 可配置维护时间窗口并记录维护历史。
 */
@Component
public class MaintenanceScheduler {
    /** 内存存储服务，提供数据维护与历史记录能力 */
    private final MemoryStorageService storageService;
    /** 任务调度器，负责周期性触发维护任务 */
    private final TaskScheduler taskScheduler;

    /** 当前维护定时任务句柄，可取消 */
    private ScheduledFuture<?> maintenanceTask;

    /** 默认维护时间窗口：22:00 至次日 06:00 */
    private static final Map<String, Integer> DEFAULT_TIME_WINDOWS = Map.of(
        "startHour", 22,
        "startMinute", 0,
        "endHour", 6,
        "endMinute", 0
    );

    /**
     * 构造方法
     * 获取内存存储单例并创建任务调度器。
     */
    public MaintenanceScheduler() {
        this.storageService = MemoryStorageService.getInstance();
        this.taskScheduler = createTaskScheduler();
    }

    /**
     * 创建任务调度器
     * 配置单线程、守护线程、维护前缀的线程池调度器。
     *
     * @return 已初始化的线程池任务调度器
     */
    private TaskScheduler createTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("maintenance-");
        scheduler.setDaemon(true);
        scheduler.initialize();
        return scheduler;
    }

    /**
     * 初始化维护调度
     * 触发首次维护任务调度。
     */
    public void initialize() {
        scheduleMaintenance();
    }

    /**
     * 调度维护任务
     * 取消已有任务后按下次执行时间以 24 小时为周期调度固定速率维护任务。
     */
    public void scheduleMaintenance() {
        cancelMaintenance();

        LocalDateTime nextExecutionTime = calculateNextExecutionTime();
        
        maintenanceTask = taskScheduler.scheduleAtFixedRate(
            this::performMaintenance,
            nextExecutionTime.toInstant(ZoneId.systemDefault().getRules().getOffset(nextExecutionTime)),
            Duration.ofHours(24)
        );
    }

    /**
     * 计算下次执行时间
     * 取维护窗口起始时间，若已过则顺延至次日。
     *
     * @return 下次维护执行的本地时间
     */
    private LocalDateTime calculateNextExecutionTime() {
        LocalDateTime now = LocalDateTime.now();
        Map<String, Integer> window = getMaintenanceWindow();
        
        LocalTime targetTime = LocalTime.of(
            window.get("startHour"),
            window.get("startMinute")
        );
        
        LocalDateTime targetDateTime = now.with(targetTime);
        
        // 若当前时间已过目标时间，则顺延至次日
        if (now.isAfter(targetDateTime)) {
            targetDateTime = targetDateTime.plusDays(1);
        }
        
        return targetDateTime;
    }

    /**
     * 设置维护时间窗口
     * 持久化时间窗口配置后重新调度维护任务。
     *
     * @param startHour   起始小时
     * @param startMinute 起始分钟
     * @param endHour     结束小时
     * @param endMinute   结束分钟
     */
    public void setMaintenanceWindow(int startHour, int startMinute, int endHour, int endMinute) {
        Map<String, Integer> window = new HashMap<>();
        window.put("startHour", startHour);
        window.put("startMinute", startMinute);
        window.put("endHour", endHour);
        window.put("endMinute", endMinute);
        
        saveMaintenanceWindow(window);
        scheduleMaintenance();
    }

    /**
     * 保存维护时间窗口
     * 将时间窗口各字段以键值形式写入应用设置表。
     *
     * @param window 时间窗口字段映射
     */
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
            // 记录错误
        }
    }

    /**
     * 获取维护时间窗口
     * 从应用设置表读取已配置的时间窗口，缺失字段回退到默认值。
     *
     * @return 时间窗口字段映射
     */
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
            // 记录错误，使用默认值
        }
        
        return window;
    }

    /**
     * 手动触发维护
     * 以手动维护类型执行一次数据清理与压缩。
     *
     * @throws Exception 当维护失败时抛出
     */
    public void runManualMaintenance() throws Exception {
        performMaintenance("manual_maintenance", "手动整理：清理过期数据并压缩数据库");
    }

    /**
     * 执行自动维护
     * 以自动维护类型执行数据清理与压缩，异常时仅记录不抛出。
     */
    private void performMaintenance() {
        try {
            performMaintenance("auto_maintenance", "自动整理：清理过期数据并压缩数据库");
        } catch (Exception e) {
            // 记录错误
        }
    }

    /**
     * 执行维护操作
     * 清理过期数据并压缩数据库，记录维护起止时间与节省空间至维护历史表。
     *
     * @param actionType 维护动作类型
     * @param details    维护详情描述
     * @throws Exception 当维护失败时抛出
     */
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

    /**
     * 取消维护任务
     * 中断当前定时任务并清空句柄。
     */
    public void cancelMaintenance() {
        if (maintenanceTask != null) {
            maintenanceTask.cancel(false);
            maintenanceTask = null;
        }
    }

    /**
     * 暂停维护
     * 取消当前维护任务。
     */
    public void pauseMaintenance() {
        cancelMaintenance();
    }

    /**
     * 恢复维护
     * 重新调度维护任务。
     */
    public void resumeMaintenance() {
        scheduleMaintenance();
    }
}