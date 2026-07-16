package com.starisle.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyResourceResponse {

    private String id;
    private String type;
    private String name;
    private String phone;
    private String address;
    private String distance;
    private String description;
    private String hours;
}