import { getVersion } from '@tauri-apps/api/app'
import { open } from '@tauri-apps/plugin-shell'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'

// GitHub 仓库配置
const GITHUB_OWNER = 'mos1128'
const GITHUB_REPO = 'ccg-gateway'

interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  html_url: string
  published_at: string
  prerelease: boolean
  draft: boolean
}

/**
 * 比较语义化版本号
 * 返回: 1 表示 v1 > v2, -1 表示 v1 < v2, 0 表示相等
 */
function compareVersions(v1: string, v2: string): number {
  // 移除 'v' 前缀
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10))
  const parts1 = normalize(v1)
  const parts2 = normalize(v2)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

/**
 * 获取最新的 GitHub Release
 */
async function getLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )
    
    if (!response.ok) {
      if (response.status === 404) {
        // 没有发布的版本
        return null
      }
      throw new Error(`HTTP error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('获取最新版本失败:', error)
    return null
  }
}

/**
 * 检查更新
 * @param silent 是否静默模式（静默模式下如果没有更新不会提示）
 */
export async function checkForUpdates(silent: boolean = true): Promise<void> {
  try {
    const currentVersion = await getVersion()
    const latestRelease = await getLatestRelease()
    
    if (!latestRelease) {
      if (!silent) {
        ElMessage.info('当前没有可用的更新')
      }
      return
    }
    
    const latestVersion = latestRelease.tag_name
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      // 有新版本
      const releaseNotes = latestRelease.body 
        ? `\n\n更新日志:\n${latestRelease.body.slice(0, 500)}${latestRelease.body.length > 500 ? '...' : ''}`
        : ''
      
      ElMessageBox.confirm(
        `发现新版本 ${latestVersion}（当前版本: v${currentVersion}）${releaseNotes}`,
        '更新提示',
        {
          confirmButtonText: '前往下载',
          cancelButtonText: '稍后再说',
          type: 'info',
          dangerouslyUseHTMLString: false
        }
      ).then(() => {
        // 打开 Release 页面
        open(latestRelease.html_url)
      }).catch(() => {
        // 用户取消
      })
    } else if (!silent) {
      ElMessage.success(`当前已是最新版本 v${currentVersion}`)
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    if (!silent) {
      ElMessage.error('检查更新失败，请检查网络连接')
    }
  }
}

/**
 * 显示通知形式的更新提示
 */
export async function checkForUpdatesNotification(): Promise<void> {
  try {
    const currentVersion = await getVersion()
    const latestRelease = await getLatestRelease()
    
    if (!latestRelease) return
    
    const latestVersion = latestRelease.tag_name
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      ElNotification({
        title: '发现新版本',
        message: `新版本 ${latestVersion} 已发布，点击查看更新`,
        type: 'info',
        duration: 0,
        onClick: () => {
          open(latestRelease.html_url)
        }
      })
    }
  } catch (error) {
    console.error('检查更新失败:', error)
  }
}
