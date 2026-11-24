package com.starisle.teacher.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.teacher.data.models.MaintenanceRecord
import com.starisle.teacher.data.models.StorageStatus
import com.starisle.teacher.data.repo.MemoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 本地存储 / 维护 ViewModel。
 *
 * 暴露当前存储状态、维护历史，以及触发手动维护的能力。
 */
@HiltViewModel
class MemoryViewModel @Inject constructor(
    private val memoryRepo: MemoryRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(MemoryUiState())
    val uiState: StateFlow<MemoryUiState> = _uiState.asStateFlow()

    init {
        loadCurrentStatus()
    }

    /** 加载一次当前存储状态。 */
    fun loadCurrentStatus() {
        viewModelScope.launch {
            try {
                val status = memoryRepo.getCurrentStatus()
                _uiState.update { it.copy(status = status, isLoading = false, error = null) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: e.toString()) }
            }
        }
    }

    /** 触发一次手动维护。 */
    fun runMaintenance() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val status = memoryRepo.runMaintenance()
                _uiState.update { it.copy(status = status, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: e.toString()) }
            }
        }
    }
}

/** 本地存储 UI 状态。 */
data class MemoryUiState(
    val status: StorageStatus? = null,
    val history: List<MaintenanceRecord> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)
