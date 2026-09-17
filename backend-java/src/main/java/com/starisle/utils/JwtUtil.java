package com.starisle.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT 工具类
 * 基于 HMAC-SHA 算法提供 JWT 令牌的生成、解析与校验能力，
 * 用于用户身份认证与角色信息传递。
 */
@Component
public class JwtUtil {

    /** 签名密钥，由配置 starisle.jwt.secret 经 HMAC-SHA 转换得到 */
    private final SecretKey key;
    /** 令牌有效期，单位毫秒，由配置 starisle.jwt.expiration 指定 */
    private final long expiration;

    /**
     * 构造方法
     * 通过 Spring 注入密钥与过期时间配置。
     *
     * @param secret     密钥字符串，需不少于 32 字符
     * @param expiration 令牌有效期毫秒数
     */
    public JwtUtil(@Value("${starisle.jwt.secret:your-secret-key-need-at-least-32-characters}") String secret,
                   @Value("${starisle.jwt.expiration:86400000}") long expiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    /**
     * 生成 JWT 令牌
     * 将用户标识与角色写入自定义声明，并设置签发时间与过期时间后签名。
     *
     * @param userId 用户标识
     * @param role   用户角色
     * @return 已签名的 JWT 字符串
     */
    public String generateToken(String userId, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("role", role);
        claims.put("iat", new Date());

        return Jwts.builder()
                .claims(claims)
                .subject(userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(key)
                .compact();
    }

    /**
     * 解析令牌声明
     * 使用密钥校验签名并返回声明体。
     *
     * @param token JWT 字符串
     * @return 声明集合
     */
    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * 提取用户标识
     * 从 subject 字段获取用户标识。
     *
     * @param token JWT 字符串
     * @return 用户标识
     */
    public String extractUserId(String token) {
        return extractClaims(token).getSubject();
    }

    /**
     * 提取用户角色
     * 从自定义声明 role 字段获取角色信息。
     *
     * @param token JWT 字符串
     * @return 用户角色
     */
    public String extractRole(String token) {
        return extractClaims(token).get("role", String.class);
    }

    /**
     * 校验令牌有效性
     * 校验签名合法性并检查是否过期。
     *
     * @param token JWT 字符串
     * @return 有效返回 true，否则返回 false
     */
    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}
