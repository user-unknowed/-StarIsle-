# 星屿后端 Java 服务 - 多阶段构建
# 阶段1: Maven 构建
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# 阶段2: 运行时
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S starisle && adduser -S starisle -G starisle
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
RUN chown -R starisle:starisle /app
USER starisle
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
