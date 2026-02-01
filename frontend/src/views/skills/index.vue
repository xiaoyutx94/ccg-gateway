<template>
  <div class="skills-page">
    <el-tabs v-model="activeTab">
      <!-- 已安装 Skills -->
      <el-tab-pane label="已安装" name="installed">
        <el-table :data="installedList" stripe style="width: 100%" v-loading="loadingInstalled">
          <el-table-column prop="name" label="名称" min-width="150" />
          <el-table-column prop="description" label="描述" min-width="200">
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="来源" min-width="150">
            <template #default="{ row }">
              <span v-if="row.repo_owner">{{ row.repo_owner }}/{{ row.repo_name }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="Claude Code" width="120">
            <template #default="{ row }">
              <el-switch
                :model-value="row.cli_flags?.claude_code"
                @change="handleCliToggle(row, 'claude_code', $event as boolean)"
              />
            </template>
          </el-table-column>
          <el-table-column label="Codex" width="100">
            <template #default="{ row }">
              <el-switch
                :model-value="row.cli_flags?.codex"
                @change="handleCliToggle(row, 'codex', $event as boolean)"
              />
            </template>
          </el-table-column>
          <el-table-column label="Gemini" width="100">
            <template #default="{ row }">
              <el-switch
                :model-value="row.cli_flags?.gemini"
                @change="handleCliToggle(row, 'gemini', $event as boolean)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="handleUninstall(row)">卸载</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 可安装 Skills -->
      <el-tab-pane label="可安装" name="available">
        <div class="tab-actions">
          <el-button type="primary" @click="fetchAvailable" :loading="loadingAvailable">
            刷新列表
          </el-button>
        </div>
        <el-table :data="availableList" stripe style="width: 100%" v-loading="loadingAvailable">
          <el-table-column prop="name" label="名称" min-width="150" />
          <el-table-column prop="description" label="描述" min-width="250">
            <template #default="{ row }">
              {{ row.description || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="来源" min-width="150">
            <template #default="{ row }">
              {{ row.repo_owner }}/{{ row.repo_name }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                @click="handleInstall(row)"
                :disabled="isInstalled(row.directory)"
              >
                {{ isInstalled(row.directory) ? '已安装' : '安装' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 仓库管理 -->
      <el-tab-pane label="仓库管理" name="repos">
        <div class="tab-actions">
          <el-button type="primary" @click="showAddRepoDialog = true">
            <el-icon><Plus /></el-icon>
            添加仓库
          </el-button>
        </div>
        <el-table :data="repoList" stripe style="width: 100%" v-loading="loadingRepos">
          <el-table-column prop="owner" label="Owner" min-width="150" />
          <el-table-column prop="name" label="仓库名" min-width="200" />
          <el-table-column prop="branch" label="分支" width="120" />
          <el-table-column label="启用" width="100">
            <template #default="{ row }">
              <el-switch
                :model-value="row.enabled"
                @change="handleRepoToggle(row, $event as boolean)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="handleRemoveRepo(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加仓库对话框 -->
    <el-dialog v-model="showAddRepoDialog" title="添加仓库" width="500px">
      <el-form :model="repoForm" label-width="80px">
        <el-form-item label="Owner" required>
          <el-input v-model="repoForm.owner" placeholder="GitHub 用户名或组织名" />
        </el-form-item>
        <el-form-item label="仓库名" required>
          <el-input v-model="repoForm.name" placeholder="仓库名称" />
        </el-form-item>
        <el-form-item label="分支">
          <el-input v-model="repoForm.branch" placeholder="默认 main" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddRepoDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddRepo">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { skillsApi } from '@/api/skills'
import type { SkillRepo, DiscoverableSkill, InstalledSkill } from '@/types/models'

const activeTab = ref('installed')

// 已安装 Skills
const installedList = ref<InstalledSkill[]>([])
const loadingInstalled = ref(false)

// 可安装 Skills
const availableList = ref<DiscoverableSkill[]>([])
const loadingAvailable = ref(false)

// 仓库
const repoList = ref<SkillRepo[]>([])
const loadingRepos = ref(false)
const showAddRepoDialog = ref(false)
const repoForm = ref({ owner: '', name: '', branch: '' })

// 检查是否已安装
const installedDirectories = computed(() => new Set(installedList.value.map(s => s.directory)))
function isInstalled(directory: string): boolean {
  const dirName = directory.split('/').pop() || directory
  return installedDirectories.value.has(dirName)
}

// 加载已安装 Skills
async function fetchInstalled() {
  loadingInstalled.value = true
  try {
    installedList.value = await skillsApi.getInstalled()
  } catch (error: any) {
    ElMessage.error(error?.message || '加载失败')
  } finally {
    loadingInstalled.value = false
  }
}

// 加载可安装 Skills
async function fetchAvailable() {
  loadingAvailable.value = true
  try {
    availableList.value = await skillsApi.discoverAvailable()
  } catch (error: any) {
    ElMessage.error(error?.message || '加载失败')
  } finally {
    loadingAvailable.value = false
  }
}

// 加载仓库列表
async function fetchRepos() {
  loadingRepos.value = true
  try {
    repoList.value = await skillsApi.getRepos()
  } catch (error: any) {
    ElMessage.error(error?.message || '加载失败')
  } finally {
    loadingRepos.value = false
  }
}

// CLI 启用/禁用
async function handleCliToggle(skill: InstalledSkill, cliType: string, enabled: boolean) {
  try {
    await skillsApi.toggleCli(skill.id, cliType, enabled)
    await fetchInstalled()
    ElMessage.success('已更新')
  } catch (error: any) {
    ElMessage.error(error?.message || '更新失败')
  }
}

// 卸载 Skill
async function handleUninstall(skill: InstalledSkill) {
  try {
    await ElMessageBox.confirm(`确定卸载 "${skill.name}"?`, '确认')
    await skillsApi.uninstall(skill.id)
    ElMessage.success('已卸载')
    await fetchInstalled()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '卸载失败')
    }
  }
}

// 安装 Skill
async function handleInstall(skill: DiscoverableSkill) {
  try {
    await skillsApi.install(skill)
    ElMessage.success('安装成功')
    await fetchInstalled()
  } catch (error: any) {
    ElMessage.error(error?.message || '安装失败')
  }
}

// 添加仓库
async function handleAddRepo() {
  if (!repoForm.value.owner.trim() || !repoForm.value.name.trim()) {
    ElMessage.error('请输入 Owner 和仓库名')
    return
  }
  try {
    await skillsApi.addRepo({
      owner: repoForm.value.owner.trim(),
      name: repoForm.value.name.trim(),
      branch: repoForm.value.branch.trim() || undefined
    })
    ElMessage.success('添加成功')
    showAddRepoDialog.value = false
    repoForm.value = { owner: '', name: '', branch: '' }
    await fetchRepos()
  } catch (error: any) {
    ElMessage.error(error?.message || '添加失败')
  }
}

// 删除仓库
async function handleRemoveRepo(repo: SkillRepo) {
  try {
    await ElMessageBox.confirm(`确定删除仓库 "${repo.owner}/${repo.name}"?`, '确认')
    await skillsApi.removeRepo(repo.owner, repo.name)
    ElMessage.success('已删除')
    await fetchRepos()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

// 启用/禁用仓库
async function handleRepoToggle(repo: SkillRepo, enabled: boolean) {
  try {
    await skillsApi.toggleRepo(repo.owner, repo.name, enabled)
    await fetchRepos()
    ElMessage.success('已更新')
  } catch (error: any) {
    ElMessage.error(error?.message || '更新失败')
  }
}

onMounted(() => {
  fetchInstalled()
  fetchRepos()
})
</script>

<style scoped>
.tab-actions {
  margin-bottom: 16px;
}
</style>
