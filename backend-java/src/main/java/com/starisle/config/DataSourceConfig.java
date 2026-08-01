package com.starisle.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Value("${spring.datasource.url}")
    private String targetUrl;

    @Value("${spring.datasource.username}")
    private String targetUsername;

    @Value("${spring.datasource.password}")
    private String targetPassword;

    @Value("${spring.datasource.driver-class-name}")
    private String targetDriver;

    @Value("${starisle.migration.source-url:jdbc:h2:mem:starisle;DB_CLOSE_DELAY=-1}")
    private String sourceUrl;

    @Value("${starisle.migration.source-username:sa}")
    private String sourceUsername;

    @Value("${starisle.migration.source-password:}")
    private String sourcePassword;

    @Value("${starisle.migration.source-driver:org.h2.Driver}")
    private String sourceDriver;

    @Bean
    @Primary
    public DataSource targetDataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName(targetDriver);
        dataSource.setUrl(targetUrl);
        dataSource.setUsername(targetUsername);
        dataSource.setPassword(targetPassword);
        return dataSource;
    }

    @Bean("sourceDataSource")
    public DataSource sourceDataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName(sourceDriver);
        dataSource.setUrl(sourceUrl);
        dataSource.setUsername(sourceUsername);
        dataSource.setPassword(sourcePassword);
        return dataSource;
    }

    @Bean
    public JdbcTemplate targetJdbcTemplate(DataSource targetDataSource) {
        return new JdbcTemplate(targetDataSource);
    }

    @Bean("sourceJdbcTemplate")
    public JdbcTemplate sourceJdbcTemplate(DataSource sourceDataSource) {
        return new JdbcTemplate(sourceDataSource);
    }
}
