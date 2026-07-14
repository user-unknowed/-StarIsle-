# StarIsle 心理健康管理系统 — 后端修复与完善文档

> 文档日期：2026-07-15
> 修复方案：方案二 — 补全项目结构缺失组件

---

## 一、问题背景

Java 后端项目（Spring Boot 3.2.5 + Java 21）存在以下结构性缺陷，导致应用无法正常启动和运行：

| 编号 | 问题描述 | 严重程度 |
|------|----------|----------|
| 1 | 引入了 `spring-boot-starter-security` 依赖但未编写 `SecurityConfig` 配置类，导致所有 API 端点被 Spring Security 默认拦截 | **致命** |
| 2 | 项目中无任何 JPA 实体类（`@Entity`）或 MongoDB 文档类（`@Document`） | **严重** |
| 3 | 无 Repository 接口，数据访问层完全缺失 | **严重** |
| 4 | `application.yml` 中 Redis 配置路径错误（`spring.redis` 应为 `spring.data.redis`） | **中等** |
| 5 | `RiskDetectionService.java` 中引用 `SemanticAnalysisResult` 未使用全限定类名，编译报错 | **致命** |
| 6 | `EncryptionUtil.java` 中 `final` 变量二次赋值，编译报错 | **致命** |
| 7 | `CorsConfig` 与 Spring Security 的 CORS 配置冲突 | **中等** |
| 8 | 无 Maven Wrapper，环境中也未安装 Maven，无法构建项目 | **中等** |
| 9 | 缺少 JWT 工具类和认证过滤器 | **严重** |

---

## 二、修改文件清单

### 2.1 新增文件

| 文件路径 | 用途 |
|----------|------|
| `backend-java/src/main/java/com/starisle/config/SecurityConfig.java` | Spring Security 安全配置类 |
| `backend-java/src/main/java/com/starisle/config/JwtAuthenticationFilter.java` | JWT 认证过滤器 |
| `backend-java/src/main/java/com/starisle/utils/JwtUtil.java` | JWT 令牌生成与验证工具类 |
| `backend-java/src/main/java/com/starisle/entity/User.java` | 用户实体类（JPA `@Entity`） |
| `backend-java/src/main/java/com/starisle/entity/MoodRecord.java` | 心情记录实体类（JPA `@Entity`） |
| `backend-java/src/main/java/com/starisle/entity/ChatMessage.java` | 聊天消息实体类（JPA `@Entity`） |
| `backend-java/src/main/java/com/starisle/entity/AssessmentResult.java` | 测评结果实体类（JPA `@Entity`） |
| `backend-java/src/main/java/com/starisle/repository/UserRepository.java` | 用户数据访问接口（`JpaRepository`） |
| `backend-java/src/main/java/com/starisle/repository/MoodRecordRepository.java` | 心情记录数据访问接口 |
| `backend-java/src/main/java/com/starisle/repository/ChatMessageRepository.java` | 聊天消息数据访问接口 |
| `backend-java/src/main/java/com/starisle/repository/AssessmentResultRepository.java` | 测评结果数据访问接口 |
| `backend-java/.mvn/wrapper/maven-wrapper.properties` | Maven Wrapper 配置文件 |

### 2.2 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `backend-java/pom.xml` | 新增 H2 数据库依赖（开发环境内嵌数据库） |
| `backend-java/src/main/resources/application.yml` | 切换默认数据库为 H2 内存模式；修正 `spring.redis` → `spring.data.redis`；排除 MongoDB/Redis 自动配置；修正 JWT 密钥长度 |
| `backend-java/src/main/java/com/starisle/config/CorsConfig.java` | 移除重复的 `CorsFilter` Bean（CORS 交由 `SecurityConfig` 统一管理） |
| `backend-java/src/main/java/com/starisle/service/RiskDetectionService.java` | 修正 `SemanticAnalysisResult` → `SemanticAnalyzer.SemanticAnalysisResult`（3处） |
| `backend-java/src/main/java/com/starisle/utils/EncryptionUtil.java` | 修正 `final` 变量赋值逻辑，使用局部变量过渡 |

---

## 三、详细修改说明

### 3.1 SecurityConfig.java（新增）

**解决的问题：** Spring Boot 检测到 `spring-boot-starter-security` 依赖后自动启用安全配置，默认拦截所有 HTTP 请求，导致前端无法访问任何 API。

**核心配置：**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                          // 禁用 CSRF（REST API 无需）
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))  // 统一 CORS
            .headers(headers -> headers.frameOptions(frame -> frame.disable())) // 允许 H2 控制台 iframe
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health").permitAll()            // 健康检查
                .requestMatchers("/h2-console/**").permitAll()     // H2 控制台
                .requestMatchers("/api/v1/**").permitAll()         // API 端点（开发阶段全部开放）
                .requestMatchers("/ws/**").permitAll()             // WebSocket 端点
                .anyRequest().authenticated()                      // 其他请求需认证
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**关键设计决策：**
- 采用无状态（STATELESS）会话策略，适配前后端分离架构
- JWT 过滤器注册在 `UsernamePasswordAuthenticationFilter` 之前
- 提供了 `BCryptPasswordEncoder` Bean 用于密码加密
- CORS 配置与安全过滤链集成，避免配置冲突

### 3.2 JwtUtil.java（新增）

**功能：** JWT 令牌的生成、解析与验证。

- 使用 `io.jsonwebtoken:jjwt` 0.12.5 版本
- 采用 HS256 签名算法，密钥最少 32 字符
- 支持从令牌中提取 `userId` 和 `role`
- 令牌有效期默认 24 小时（86400000 毫秒）

### 3.3 JwtAuthenticationFilter.java（新增）

**功能：** 拦截每个 HTTP 请求，从 `Authorization: Bearer <token>` 头中提取 JWT 并设置认证上下文。

- 继承 `OncePerRequestFilter`，确保每请求只执行一次
- 令牌无效时不阻断请求，仅不设置认证信息（由后续授权逻辑决定是否放行）

### 3.4 实体类（新增 4 个）

| 实体类 | 表名 | 主要字段 |
|--------|------|----------|
| `User` | `users` | id, username, passwordHash, nickname, avatar, ageGroup, role, classId, schoolName |
| `MoodRecord` | `mood_records` | id, userId, moodLevel, checkinDate, note, tags（`@ElementCollection`） |
| `ChatMessage` | `chat_messages` | id, userId, role, content, messageType, riskLevel, responseTimeMs |
| `AssessmentResult` | `assessment_results` | id, userId, type, totalScore, riskLevel, description, answersJson |

**设计规范：**
- 主键采用 UUID 策略（`@GeneratedValue(strategy = GenerationType.UUID)`）
- 使用 `@PrePersist` / `@PreUpdate` 自动维护时间戳
- 全部使用 Lombok `@Data` + `@Builder` 简化代码

### 3.5 Repository 接口（新增 4 个）

| 接口 | 继承 | 自定义查询方法 |
|------|------|----------------|
| `UserRepository` | `JpaRepository<User, String>` | `findByUsername`, `existsByUsername`, `findByRole`, `findByClassId` |
| `MoodRecordRepository` | `JpaRepository<MoodRecord, String>` | `findByUserIdOrderByCheckinDateDesc`, `findByUserIdAndCheckinDateBetween...`, `findByUserIdAndCheckinDate` |
| `ChatMessageRepository` | `JpaRepository<ChatMessage, String>` | `findByUserIdOrderByCreatedAtDesc`, `findTop50ByUserIdOrderByCreatedAtDesc` |
| `AssessmentResultRepository` | `JpaRepository<AssessmentResult, String>` | `findByUserIdOrderByCreatedAtDesc`, `findByUserIdAndTypeOrderByCreatedAtDesc` |

### 3.6 application.yml 修改

| 配置项 | 修改前 | 修改后 | 原因 |
|--------|--------|--------|------|
| 数据源 URL | `jdbc:postgresql://localhost:5432/starisle` | `jdbc:h2:mem:starisle;DB_CLOSE_DELAY=-1;MODE=PostgreSQL` | 开发环境无需外部 PostgreSQL |
| 数据库驱动 | `org.postgresql.Driver` | `org.h2.Driver` | 匹配 H2 数据库 |
| Hibernate 方言 | `PostgreSQLDialect` | `H2Dialect` | 匹配 H2 数据库 |
| Redis 配置路径 | `spring.redis` | `spring.data.redis` | Spring Boot 3.x 变更 |
| 自动配置排除 | 无 | 排除 MongoDB、Redis 自动配置 | 外部服务不可用时不阻断启动 |
| JWT 密钥 | `your-secret-key`（16字符） | `starisle-jwt-secret-key-2026-very-secure`（38字符） | HS256 要求最少 32 字符 |
| H2 控制台 | 未配置 | `enabled: true, path: /h2-console` | 方便开发调试 |

### 3.7 编译错误修复

**RiskDetectionService.java（3处）：**

```java
// 修改前（编译报错：找不到符号 SemanticAnalysisResult）
SemanticAnalysisResult semanticRisk = semanticAnalyzer.analyze(content);

// 修改后
SemanticAnalyzer.SemanticAnalysisResult semanticRisk = semanticAnalyzer.analyze(content);
```

**EncryptionUtil.java：**

```java
// 修改前（编译报错：可能已分配变量 encryptionKey）
public EncryptionUtil() {
    this.encryptionKey = System.getenv("ENCRYPTION_KEY");
    if (this.encryptionKey == null || this.encryptionKey.isEmpty()) {
        this.encryptionKey = generateKey();  // final 变量二次赋值
    }
}

// 修改后
public EncryptionUtil() {
    String key = System.getenv("ENCRYPTION_KEY");
    if (key == null || key.isEmpty()) {
        key = generateKey();
    }
    this.encryptionKey = key;  // 仅赋值一次
}
```

### 3.8 CorsConfig.java 修改

移除了原有的 `CorsFilter` Bean 定义，CORS 配置统一由 `SecurityConfig.corsConfigurationSource()` 管理，避免过滤器链中的 CORS 配置冲突。

### 3.9 pom.xml 修改

新增 H2 数据库依赖：

```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

---

## 四、环境搭建

### 4.1 Maven 安装

由于环境中未安装 Maven，已下载 Apache Maven 3.9.9 至 `C:\maven\apache-maven-3.9.9\`。

使用方式：

```powershell
& "C:\maven\apache-maven-3.9.9\bin\mvn.cmd" <command>
```

### 4.2 构建与运行

```bash
# 编译
mvn clean compile

# 打包（跳过测试）
mvn package -DskipTests

# 运行
mvn spring-boot:run

# 或直接运行 JAR
java -jar target/starisle-backend-1.0.0.jar
```

---

## 五、测试验证结果

### 5.1 构建验证

| 阶段 | 结果 |
|------|------|
| `mvn clean compile` | **BUILD SUCCESS**（30 个源文件编译通过） |
| `mvn package -DskipTests` | **BUILD SUCCESS**（生成 `starisle-backend-1.0.0.jar`） |
| `mvn spring-boot:run` | **启动成功**（4.278 秒） |

### 5.2 API 端点测试

应用启动后对以下端点进行了 HTTP 请求验证：

| 端点 | 方法 | 测试数据 | 响应状态 | 关键响应字段 |
|------|------|----------|----------|-------------|
| `/health` | GET | — | 200 | `status: "healthy"` |
| `/api/v1/chat/topics` | GET | — | 200 | 返回 5 个话题卡片 |
| `/api/v1/risk/crisis/hotlines` | GET | — | 200 | 返回 3 条危机热线 |
| `/api/v1/mood/checkin` | POST | `moodLevel: 4, tags: ["学习压力"]` | 200 | `message: "心情打卡成功"` |
| `/api/v1/risk/detect`（低风险） | POST | `content: "今天感觉不太好"` | 200 | `risk_level: "green", need_intervention: false` |
| `/api/v1/risk/detect`（高风险） | POST | `content: "我觉得活着没意义，不想活了"` | 200 | `risk_level: "red", need_intervention: true, triggered_keywords: ["不想活","活着没意义"]` |

### 5.3 日志验证

启动日志中关键确认项：

```
Found 4 JPA repository interfaces.                    # 4 个 Repository 被正确扫描
H2 console available at '/h2-console'.                # H2 控制台已启用
Filter 'jwtAuthenticationFilter' configured for use.  # JWT 过滤器已注册
Tomcat started on port 8080 (http).                   # Web 服务器在 8080 端口启动
Started StarIsleApplication in 4.278 seconds.         # 应用启动成功
```

---

## 六、生产环境部署注意事项

当前配置为开发环境默认值，部署到生产环境前需调整以下配置：

1. **数据库切换**：通过环境变量 `DATABASE_URL`、`DATABASE_USERNAME`、`DATABASE_PASSWORD`、`DATABASE_DRIVER` 切换回 PostgreSQL
2. **Hibernate 方言**：通过环境变量 `HIBERNATE_DIALECT` 设置为 `org.hibernate.dialect.PostgreSQLDialect`
3. **移除自动配置排除**：从 `application.yml` 中移除 `spring.autoconfigure.exclude` 下的 MongoDB 和 Redis 排除项
4. **JWT 密钥**：通过环境变量 `JWT_SECRET` 设置高强度密钥
5. **加密密钥**：通过环境变量 `ENCRYPTION_KEY` 设置 32 字节 Base64 编码密钥
6. **H2 控制台**：关闭 `spring.h2.console.enabled`
7. **API 权限**：将 `SecurityConfig` 中 `permitAll()` 的端点按实际需求收紧，仅保留必要的公开端点

---

## 七、项目文件结构（修复后）

```
backend-java/
├── .mvn/
│   └── wrapper/
│       └── maven-wrapper.properties
├── pom.xml                                    [修改]
├── src/
│   └── main/
│       ├── java/com/starisle/
│       │   ├── StarIsleApplication.java
│       │   ├── config/
│       │   │   ├── AppConfig.java
│       │   │   ├── CorsConfig.java            [修改]
│       │   │   ├── SecurityConfig.java        [新增]
│       │   │   ├── JwtAuthenticationFilter.java [新增]
│       │   │   └── WebSocketConfig.java
│       │   ├── controller/
│       │   │   ├── AssessmentController.java
│       │   │   ├── ChatController.java
│       │   │   ├── ContentController.java
│       │   │   ├── HealthController.java
│       │   │   ├── MoodController.java
│       │   │   ├── RiskController.java
│       │   │   └── UserController.java
│       │   ├── entity/                        [新增目录]
│       │   │   ├── User.java                  [新增]
│       │   │   ├── MoodRecord.java            [新增]
│       │   │   ├── ChatMessage.java           [新增]
│       │   │   └── AssessmentResult.java      [新增]
│       │   ├── repository/                    [新增目录]
│       │   │   ├── UserRepository.java        [新增]
│       │   │   ├── MoodRecordRepository.java  [新增]
│       │   │   ├── ChatMessageRepository.java [新增]
│       │   │   └── AssessmentResultRepository.java [新增]
│       │   ├── service/
│       │   │   ├── ChatService.java
│       │   │   ├── EmotionAnalysisService.java
│       │   │   ├── RiskDetectionService.java  [修改]
│       │   │   ├── SemanticAnalyzer.java
│       │   │   └── StarIsleSystemPrompt.java
│       │   ├── utils/
│       │   │   ├── EncryptionUtil.java        [修改]
│       │   │   ├── JwtUtil.java               [新增]
│       │   │   └── KeywordManager.java
│       │   └── websocket/
│       │       └── ChatWebSocketHandler.java
│       └── resources/
│           └── application.yml                [修改]
└── target/
    └── starisle-backend-1.0.0.jar             [构建产物]
```
