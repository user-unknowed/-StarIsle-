package com.starisle.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

/**
 * 数据源配置类
 * 同时维护目标数据源（生产/迁移后端）与源数据源（H2 内存库，迁移前数据），
 * 为数据迁移流程提供两套独立的数据源与 JdbcTemplate。
 */
@Configuration
public class DataSourceConfig {

    // 目标数据源 JDBC 连接地址
    @Value("${spring.datasource.url}")
    private String targetUrl;

    // 目标数据源用户名
    @Value("${spring.datasource.username}")
    private String targetUsername;

    // 目标数据源密码
    @Value("${spring.datasource.password}")
    private String targetPassword;

    // 目标数据源 JDBC 驱动类
    @Value("${spring.datasource.driver-class-name}")
    private String targetDriver;

    // 源数据源 JDBC 连接地址，默认 H2 内存库
    @Value("${starisle.migration.source-url:jdbc:h2:mem:starisle;DB_CLOSE_DELAY=-1}")
    private String sourceUrl;

    // 源数据源用户名，默认 sa
    @Value("${starisle.migration.source-username:sa}")
    private String sourceUsername;

    // 源数据源密码，默认空
    @Value("${starisle.migration.source-password:}")
    private String sourcePassword;

    // 源数据源 JDBC 驱动类，默认 H2 驱动
    @Value("${starisle.migration.source-driver:org.h2.Driver}")
    private String sourceDriver;

    /**
     * 主数据源 Bean（目标库）
     *
     * @return 配置好的 DriverManagerDataSource 实例
     */
    @Bean
    @Primary
    public DataSource targetDataSource() {
        // 通过 DriverManagerDataSource 构建目标库连接
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName(targetDriver);
        dataSource.setUrl(targetUrl);
        dataSource.setUsername(targetUsername);
        dataSource.setPassword(targetPassword);
        return dataSource;
    }

    /**
     * 源数据源 Bean（迁移前数据）
     *
     * @return 配置好的 DriverManagerDataSource 实例
     */
    @Bean("sourceDataSource")
    public DataSource sourceDataSource() {
        // 通过 DriverManagerDataSource 构建源库连接
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName(sourceDriver);
        dataSource.setUrl(sourceUrl);
        dataSource.setUsername(sourceUsername);
        dataSource.setPassword(sourcePassword);
        return dataSource;
    }

    /**
     * 目标库 JdbcTemplate Bean
     *
     * @param targetDataSource 目标数据源
     * @return 绑定目标库的 JdbcTemplate
     */
    @Bean
    public JdbcTemplate targetJdbcTemplate(DataSource targetDataSource) {
        return new JdbcTemplate(targetDataSource);
    }

    /**
     * 源库 JdbcTemplate Bean
     *
     * @param sourceDataSource 源数据源
     * @return 绑定源库的 JdbcTemplate
     */
    @Bean("sourceJdbcTemplate")
    public JdbcTemplate sourceJdbcTemplate(DataSource sourceDataSource) {
        return new JdbcTemplate(sourceDataSource);
    }
}
