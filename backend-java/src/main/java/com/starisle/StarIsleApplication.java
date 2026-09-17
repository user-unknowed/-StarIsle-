package com.starisle;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * StarIsle 星岛应用启动类入口
 */
@SpringBootApplication
public class StarIsleApplication {

    /**
     * 应用主入口方法，启动 Spring Boot 容器
     *
     * @param args 命令行启动参数
     */
    public static void main(String[] args) {
        // 启动 Spring Boot 应用上下文并初始化内嵌 Web 容器
        SpringApplication.run(StarIsleApplication.class, args);
    }
}
