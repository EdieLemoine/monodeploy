import { resolveGroupName } from '@monodeploy/io'
import { type MonodeployConfiguration, RegistryMode, type YarnContext } from '@monodeploy/types'
import { Workspace } from '@yarnpkg/core'
import * as pluginNPM from '@yarnpkg/plugin-npm'

export const getPublishRegistryUrl = async ({
    config,
    context,
    workspace,
}: {
    config: MonodeployConfiguration
    context: YarnContext
    workspace: Workspace
}): Promise<string | null> => {
    const groupName = resolveGroupName({
        context,
        workspace,
        packageGroupManifestField: config.packageGroupManifestField,
    })
    if (groupName) {
        const registryMode = config.packageGroups?.[groupName]?.registryMode ?? config.registryMode
        if (registryMode === RegistryMode.Manifest) {
            return null
        }
    }

    if (config.noRegistry) {
        throw new Error(
            '[Write] Critical invariant violation around noRegistry vs. registryMode check. Please open a GitHub issue on Monodeploy.',
        )
    }

    const configRegistryUrl = config.registryUrl
    if (configRegistryUrl) {
        return pluginNPM.npmConfigUtils.normalizeRegistry(configRegistryUrl)
    }

    return await pluginNPM.npmConfigUtils.getPublishRegistry(workspace.manifest, {
        configuration: context.configuration,
    })
}
