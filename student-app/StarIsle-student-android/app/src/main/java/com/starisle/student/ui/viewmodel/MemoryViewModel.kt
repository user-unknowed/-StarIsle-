package com.starisle.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.student.data.repo.MemoryRepository
import com.starisle.student.util.MaintenanceRecordUi
import com.starisle.student.util.StorageMonitor
import com.starisle.student.util.StorageStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 内存存储 ViewModel，包装 [MemoryRepository] 与 [StorageMonitor] 供 UI 调用。
 */
@HiltViewModel
class MemoryViewModel @Inject constructor(
    private val memoryRepository: MemoryRepository,
    val storageMonitor: StorageMonitor,
) : ViewModel() {

    private val _status = MutableStateFlow<StorageStatus?>(null)
    val status: StateFlow<StorageStatus?> = _status.asStateFlow()

    private val _history = MutableStateFlow<List<MaintenanceRecordUi>>(emptyList())
    val history: StateFlow<List<MaintenanceRecordUi>> = _history.asStateFlow()

    fun refreshStatus() {
        viewModelScope.launch {
            runCatching { storageMonitor.getCurrentStatus() }
                .onSuccess { _status.value = it }
        }
    }

    fun refreshHistory() {
        viewModelScope.launch {
            runCatching { storageMonitor.getMaintenanceHistory() }
                .onSuccess { _history.value = it }
        }
    }

    fun runManualMaintenance() {
        viewModelScope.launch {
            // 由 MaintenanceScheduler 调用，此处通过 repository 触发同等流程
            runCatching {
                memoryRepository.clearExpiredData()
                memoryRepository.compactDatabase()
            }
            refreshStatus()
            refreshHistory()
        }
    }

    fun clearAllData() {
        viewModelScope.launch {
            runCatching { memoryRepository.clearAllData() }
            refreshStatus()
        }
    }
}
