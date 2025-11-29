/**
 * Public Works Processing
 * 
 * Handles council public works projects:
 * - Contribution tracking
 * - Completion detection
 * - Region bonus application
 */

function calculateCompletion(
  requiredResources: Record<string, number>,
  contributedResources: Record<string, number>
): { percentage: number; totalRequired: number; totalContributed: number } {
  let totalRequired = 0;
  let totalContributed = 0;

  for (const [resourceCode, requiredAmount] of Object.entries(requiredResources)) {
    const required = typeof requiredAmount === 'number' ? requiredAmount : 0;
    const contributed =
      typeof contributedResources[resourceCode] === 'number' ? contributedResources[resourceCode] : 0;
    totalRequired += required;
    totalContributed += Math.min(contributed, required);
  }

  const percentage = totalRequired > 0 ? Math.min(100, (totalContributed / totalRequired) * 100) : 100;
  return { percentage, totalRequired, totalContributed };
}

export class PublicWorksProcessor {
  /**
   * Process all active public works projects
   * Checks completion status and applies bonuses when complete
   */
  static async processPublicWorks(db: D1Database): Promise<void> {
    // Get all active public works
    const activeWorks = await db.prepare(
      `SELECT pw.*, c.region_id 
       FROM public_works pw
       JOIN councils c ON pw.council_id = c.id
       WHERE pw.status = 'active'`
    )
      .all<{
        id: string;
        council_id: string;
        project_code: string;
        name: string;
        required_resources_json: string;
        contributed_resources_json: string;
        completion_percentage: number;
        region_bonus_json: string | null;
        region_id: string;
      }>();

    for (const work of activeWorks.results) {
      try {
        const requiredResources = JSON.parse(work.required_resources_json || '{}');
        const contributedResources = JSON.parse(work.contributed_resources_json || '{}');
        const regionBonus = work.region_bonus_json ? JSON.parse(work.region_bonus_json) : null;

        // Calculate completion percentage
        let totalRequired = 0;
        let totalContributed = 0;

        for (const [resourceCode, requiredAmount] of Object.entries(requiredResources)) {
          const required = typeof requiredAmount === 'number' ? requiredAmount : 0;
          const contributed = typeof contributedResources[resourceCode] === 'number' 
            ? contributedResources[resourceCode] 
            : 0;
          
          totalRequired += required;
          totalContributed += Math.min(contributed, required); // Cap at required amount
        }

        const completionPercentage = totalRequired > 0 
          ? Math.min(100, (totalContributed / totalRequired) * 100)
          : 100;

        // Update completion percentage
        await db.prepare(
          'UPDATE public_works SET completion_percentage = ? WHERE id = ?'
        )
          .bind(completionPercentage, work.id)
          .run();

        // Check if project is complete
        if (completionPercentage >= 100) {
          await this.completePublicWork(db, work, regionBonus);
        }
      } catch (error) {
        console.error(`Error processing public work ${work.id}:`, error);
      }
    }

    await this.processCouncilProjects(db);
  }

  /**
   * Complete a public works project and apply region bonuses
   */
  static async completePublicWork(
    db: D1Database,
    work: {
      id: string;
      council_id: string;
      region_id: string;
      project_code: string;
      name: string;
      region_bonus_json: string | null;
    },
    regionBonus: any
  ): Promise<void> {
    const now = Date.now();

    // Mark project as completed
    await db.prepare(
      'UPDATE public_works SET status = ?, completed_at = ? WHERE id = ?'
    )
      .bind('completed', now, work.id)
      .run();

    // Apply region bonuses if specified
    if (regionBonus && typeof regionBonus === 'object') {
      // Region bonuses are typically applied to all cities in the region
      // For now, we'll store the bonus in a way that can be queried
      // In a full implementation, you might want a region_bonuses table
      
      // Log completion event
      await db.prepare(
        `INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          null, // Public works are council-wide, not user-specific
          'public_work_completed',
          JSON.stringify({
            publicWorkId: work.id,
            councilId: work.council_id,
            regionId: work.region_id,
            projectCode: work.project_code,
            name: work.name,
            regionBonus,
            completedAt: now
          }),
          now
        )
        .run();
    }

    // Notify council members (via analytics events)
    const councilMembers = await db.prepare(
      'SELECT user_id FROM council_members WHERE council_id = ?'
    )
      .bind(work.council_id)
      .all<{ user_id: string }>();

    for (const member of councilMembers.results) {
      await db.prepare(
        `INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          member.user_id,
          'public_work_completed_notification',
          JSON.stringify({
            publicWorkId: work.id,
            projectCode: work.project_code,
            name: work.name,
            message: `Public work "${work.name}" has been completed!`
          }),
          now
        )
        .run();
    }
  }

  static async processCouncilProjects(db: D1Database): Promise<void> {
    const projects = await db.prepare(
      `SELECT cp.*, c.region_id, pd.code, pd.name, pd.required_resources_json, pd.buff_json
       FROM council_projects cp
       JOIN councils c ON cp.council_id = c.id
       JOIN council_project_defs pd ON cp.project_def_id = pd.id
       WHERE cp.status = 'active'`
    ).all<{
      id: string;
      council_id: string;
      region_id: string;
      project_def_id: string;
      status: string;
      contributed_resources_json: string;
      progress: number;
      code: string;
      name: string;
      required_resources_json: string;
      buff_json: string | null;
    }>();

    for (const project of projects.results) {
      try {
        const requiredResources = JSON.parse(project.required_resources_json || '{}');
        const contributedResources = JSON.parse(project.contributed_resources_json || '{}');
        const { percentage } = calculateCompletion(requiredResources, contributedResources);

        if (percentage !== project.progress) {
          await db.prepare('UPDATE council_projects SET progress = ? WHERE id = ?').bind(percentage, project.id).run();
        }

        if (percentage >= 100) {
          await this.completeCouncilProject(db, project, project.buff_json ? JSON.parse(project.buff_json) : {});
        }
      } catch (err) {
        console.error(`Error processing council project ${project.id}`, err);
      }
    }
  }

  static async completeCouncilProject(
    db: D1Database,
    project: {
      id: string;
      council_id: string;
      region_id: string;
      code: string;
      name: string;
    },
    buff: Record<string, any>
  ): Promise<void> {
    const now = Date.now();
    await db.prepare('UPDATE council_projects SET status = ?, completed_at = ?, progress = 100 WHERE id = ?')
      .bind('completed', now, project.id)
      .run();

    const prestige = await db
      .prepare('SELECT season, prestige_score, buffs_json FROM council_prestige WHERE council_id = ?')
      .bind(project.council_id)
      .first<{ season: string; prestige_score: number; buffs_json: string | null }>();
    const currentSeason = prestige?.season ?? `S${new Date().getUTCFullYear()}`;
    const buffs = prestige?.buffs_json ? JSON.parse(prestige.buffs_json) : {};
    buffs[project.code] = buff || {};

    if (prestige) {
      await db
        .prepare(
          `UPDATE council_prestige
           SET prestige_score = prestige_score + ?, buffs_json = ?, season = ?, updated_at = ?
           WHERE council_id = ?`
        )
        .bind(25, JSON.stringify(buffs), currentSeason, now, project.council_id)
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO council_prestige (council_id, season, prestige_score, buffs_json, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(project.council_id, currentSeason, 25, JSON.stringify(buffs), now)
        .run();
    }

    await db.prepare(
      `INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at)
       VALUES (?, NULL, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        'council_project_completed',
        JSON.stringify({
          projectId: project.id,
          councilId: project.council_id,
          regionId: project.region_id,
          code: project.code,
          name: project.name,
          buff,
          completedAt: now,
        }),
        now
      )
      .run();

    const members = await db.prepare('SELECT user_id FROM council_members WHERE council_id = ?')
      .bind(project.council_id)
      .all<{ user_id: string }>();

    for (const member of members.results) {
      await db.prepare(
        `INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          member.user_id,
          'council_project_notification',
          JSON.stringify({
            projectId: project.id,
            code: project.code,
            name: project.name,
            message: `Council project "${project.name}" completed!`,
          }),
          now
        )
        .run();
    }
  }

  /**
   * Contribute resources to a public works project
   */
  static async contributeToPublicWork(
    db: D1Database,
    publicWorkId: string,
    userId: string,
    contributions: Record<string, number>
  ): Promise<{ success: boolean; completionPercentage: number; error?: string }> {
    // Verify user is a council member
    const publicWork = await db.prepare(
      `SELECT pw.*, c.region_id 
       FROM public_works pw
       JOIN councils c ON pw.council_id = c.id
       WHERE pw.id = ? AND pw.status = 'active'`
    )
      .bind(publicWorkId)
      .first<{
        id: string;
        council_id: string;
        required_resources_json: string;
        contributed_resources_json: string;
      }>();

    if (!publicWork) {
      return {
        success: false,
        completionPercentage: 0,
        error: 'Public work not found or not active'
      };
    }

    // Check if user is a council member
    const membership = await db.prepare(
      'SELECT * FROM council_members WHERE council_id = ? AND user_id = ?'
    )
      .bind(publicWork.council_id, userId)
      .first();

    if (!membership) {
      return {
        success: false,
        completionPercentage: 0,
        error: 'You must be a council member to contribute'
      };
    }

    // Get user's city
    const city = await db.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return {
        success: false,
        completionPercentage: 0,
        error: 'City not found'
      };
    }

    const requiredResources = JSON.parse(publicWork.required_resources_json || '{}');
    const currentContributions = JSON.parse(publicWork.contributed_resources_json || '{}');
    const updatedContributions = { ...currentContributions };

    const ledgerEntries: Array<{ resourceCode: string; amount: number }> = [];

    // Validate and deduct resources
    for (const [resourceCode, contributionAmount] of Object.entries(contributions)) {
      if (typeof contributionAmount !== 'number' || contributionAmount <= 0) {
        continue;
      }

      // Check if this resource is required
      const requiredAmount = typeof requiredResources[resourceCode] === 'number' 
        ? requiredResources[resourceCode] 
        : 0;
      
      if (requiredAmount === 0) {
        continue; // Skip resources not required for this project
      }

      // Check how much has already been contributed
      const alreadyContributed = typeof currentContributions[resourceCode] === 'number'
        ? currentContributions[resourceCode]
        : 0;
      
      const stillNeeded = Math.max(0, requiredAmount - alreadyContributed);
      const actualContribution = Math.min(contributionAmount, stillNeeded);

      if (actualContribution > 0) {
        // Get resource ID
        const resource = await db.prepare(
          'SELECT id FROM resources WHERE code = ?'
        )
          .bind(resourceCode)
          .first<{ id: string }>();

        if (!resource) {
          continue; // Skip invalid resources
        }

        // Check city has enough resources
        const cityResource = await db.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
        )
          .bind(city.id, resource.id)
          .first<{ amount: number }>();

        const availableAmount = Math.max(0, cityResource?.amount || 0);
        
        if (availableAmount < actualContribution) {
          return {
            success: false,
            completionPercentage: 0,
            error: `Insufficient ${resourceCode}. You have ${availableAmount}, need ${actualContribution}`
          };
        }

        // Deduct resources from city
        const newAmount = Math.max(0, availableAmount - actualContribution);
        await db.prepare(
          `UPDATE city_resources SET amount = ? 
           WHERE city_id = ? AND resource_id = ?`
        )
          .bind(newAmount, city.id, resource.id)
          .run();

        // Update contributions
        updatedContributions[resourceCode] = (updatedContributions[resourceCode] || 0) + actualContribution;
        ledgerEntries.push({ resourceCode, amount: actualContribution });
      }
    }

    // Update public works with new contributions
    await db.prepare(
      'UPDATE public_works SET contributed_resources_json = ? WHERE id = ?'
    )
      .bind(JSON.stringify(updatedContributions), publicWorkId)
      .run();

    // Recalculate completion percentage
    let totalRequired = 0;
    let totalContributed = 0;

    for (const [resourceCode, requiredAmount] of Object.entries(requiredResources)) {
      const required = typeof requiredAmount === 'number' ? requiredAmount : 0;
      const contributed = typeof updatedContributions[resourceCode] === 'number' 
        ? updatedContributions[resourceCode] 
        : 0;
      
      totalRequired += required;
      totalContributed += Math.min(contributed, required);
    }

    const completionPercentage = totalRequired > 0 
      ? Math.min(100, (totalContributed / totalRequired) * 100)
      : 100;

    await db.prepare(
      'UPDATE public_works SET completion_percentage = ? WHERE id = ?'
    )
      .bind(completionPercentage, publicWorkId)
      .run();

    for (const entry of ledgerEntries) {
      await db.prepare(
        `INSERT INTO council_member_contributions (id, council_id, user_id, contribution_type, target_id, resource_code, amount, metadata_json, contributed_at)
         VALUES (?, ?, ?, 'project', ?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          publicWork.council_id,
          userId,
          publicWorkId,
          entry.resourceCode,
          entry.amount,
          JSON.stringify({ type: 'public_work' }),
          Date.now()
        )
        .run();
    }

    return {
      success: true,
      completionPercentage
    };
  }

  static async contributeToCouncilProject(
    db: D1Database,
    projectId: string,
    userId: string,
    contributions: Record<string, number>
  ): Promise<{ success: boolean; progress: number; error?: string }> {
    const project = await db.prepare(
      `SELECT cp.*, pd.required_resources_json
       FROM council_projects cp
       JOIN council_project_defs pd ON cp.project_def_id = pd.id
       WHERE cp.id = ? AND cp.status = 'active'`
    )
      .bind(projectId)
      .first<{
        id: string;
        council_id: string;
        required_resources_json: string;
        contributed_resources_json: string;
      }>();

    if (!project) {
      return { success: false, progress: 0, error: 'Project not found or inactive' };
    }

    const membership = await db.prepare('SELECT * FROM council_members WHERE council_id = ? AND user_id = ?')
      .bind(project.council_id, userId)
      .first();

    if (!membership) {
      return { success: false, progress: 0, error: 'You must be a council member to contribute' };
    }

    const city = await db.prepare('SELECT id FROM cities WHERE user_id = ?')
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return { success: false, progress: 0, error: 'City not found' };
    }

    const requiredResources = JSON.parse(project.required_resources_json || '{}');
    const currentContributions = JSON.parse(project.contributed_resources_json || '{}');
    const updatedContributions = { ...currentContributions };
    const ledgerEntries: Array<{ resourceCode: string; amount: number }> = [];

    for (const [resourceCode, contributionAmount] of Object.entries(contributions)) {
      if (typeof contributionAmount !== 'number' || contributionAmount <= 0) {
        continue;
      }

      const requiredAmount = typeof requiredResources[resourceCode] === 'number' ? requiredResources[resourceCode] : 0;
      if (!requiredAmount) continue;
      const already = typeof currentContributions[resourceCode] === 'number' ? currentContributions[resourceCode] : 0;
      const stillNeeded = Math.max(0, requiredAmount - already);
      const actualContribution = Math.min(contributionAmount, stillNeeded);
      if (!actualContribution) continue;

      const resource = await db.prepare('SELECT id FROM resources WHERE code = ?').bind(resourceCode).first<{ id: string }>();
      if (!resource) continue;

      const cityResource = await db.prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, resource.id)
        .first<{ amount: number }>();

      const available = Math.max(0, cityResource?.amount || 0);
      if (available < actualContribution) {
        return { success: false, progress: 0, error: `Insufficient ${resourceCode}` };
      }

      await db.prepare('UPDATE city_resources SET amount = amount - ? WHERE city_id = ? AND resource_id = ?')
        .bind(actualContribution, city.id, resource.id)
        .run();

      updatedContributions[resourceCode] = (updatedContributions[resourceCode] || 0) + actualContribution;
      ledgerEntries.push({ resourceCode, amount: actualContribution });
    }

    await db.prepare('UPDATE council_projects SET contributed_resources_json = ? WHERE id = ?')
      .bind(JSON.stringify(updatedContributions), projectId)
      .run();

    const { percentage } = calculateCompletion(requiredResources, updatedContributions);

    await db.prepare('UPDATE council_projects SET progress = ? WHERE id = ?')
      .bind(percentage, projectId)
      .run();

    for (const entry of ledgerEntries) {
      await db.prepare(
        `INSERT INTO council_member_contributions (id, council_id, user_id, contribution_type, target_id, resource_code, amount, metadata_json, contributed_at)
         VALUES (?, ?, ?, 'project', ?, ?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          project.council_id,
          userId,
          projectId,
          entry.resourceCode,
          entry.amount,
          JSON.stringify({ type: 'council_project' }),
          Date.now()
        )
        .run();
    }

    return { success: true, progress: percentage };
  }
}

