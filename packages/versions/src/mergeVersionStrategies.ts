import { resolveGroupName } from '@monodeploy/io'
import {
    MonodeployConfiguration,
    PackageStrategyMap,
    PackageStrategyType,
    YarnContext,
} from '@monodeploy/types'
import { structUtils } from '@yarnpkg/core'

import { maxStrategy } from './versionStrategy'

const mergeVersionStrategies = async ({
    config,
    context,
    intentionalStrategies,
    implicitVersionStrategies,
}: {
    config: MonodeployConfiguration
    context: YarnContext
    intentionalStrategies: PackageStrategyMap
    implicitVersionStrategies: PackageStrategyMap
}): Promise<{
    versionStrategies: PackageStrategyMap
    workspaceGroups: Map<string, Set<string>>
}> => {
    const strategies: PackageStrategyMap = new Map([
        ...intentionalStrategies.entries(),
        ...implicitVersionStrategies.entries(),
    ])

    const groups = new Map<string, Set<string>>()
    for (const workspace of context.project.workspaces) {
        const groupKey = resolveGroupName({
            context,
            workspace,
            packageGroupManifestField: config.packageGroupManifestField,
        })
        if (!groupKey || !workspace.manifest.name) continue

        const ident = structUtils.stringifyIdent(workspace.manifest.name)
        const group = groups.get(groupKey) ?? new Set()
        group.add(ident)
        groups.set(groupKey, group)
    }

    for (const group of groups.values()) {
        // we use the highest strategy among the group. This ensures the final version
        // conforms to the format specified by the most meaningful commit. E.g. 4.0.0 indicates
        // a breaking change, while 4.1.1 is guaranteed to be a patch (or at a min, a commit
        // that the end user does not need to worry about).
        const strategy = Array.from(group).reduce(
            (curr, name) =>
                strategies.has(name) ? maxStrategy(curr, strategies.get(name)?.type) : curr,
            undefined as PackageStrategyType | undefined,
        )

        if (!strategy) continue

        for (const workspaceIdent of group) {
            // only update existing strategies, do not introduce new ones
            // (for example from packages not being modified)
            if (!strategies.has(workspaceIdent)) continue

            strategies.set(workspaceIdent, {
                ...strategies.get(workspaceIdent)!,
                type: strategy,
            })
        }
    }

    return { versionStrategies: strategies, workspaceGroups: groups }
}

export default mergeVersionStrategies
