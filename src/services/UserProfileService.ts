import { UserProfile } from '@/models/index.js';
import { IUserProfile, IPersonalDetails, IEmergencyContact, IEducation, IWorkExperience, ISkill } from '@/types/index.js';
import { ApiError } from '@/utils/response.js';

export interface ProfileFilters {
  isProfileComplete?: boolean;
  completionPercentage?: {
    $gte?: number;
    $lte?: number;
  };
  organizationCode?: string;
}

class UserProfileService {
  
  /**
   * Get user profile by userId
   */
  async getProfile(userId: string, organizationCode?: string): Promise<IUserProfile | null> {
    const query: any = { userId };
    if (organizationCode) {
      query.organizationCode = organizationCode;
    }
    
    return UserProfile.findOne(query)
      .populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Create or update user profile
   */
  async upsertProfile(
    userId: string, 
    profileData: Partial<IUserProfile>, 
    organizationCode: string
  ): Promise<IUserProfile> {
    const existingProfile = await UserProfile.findOne({ userId, organizationCode });
    
    if (existingProfile) {
      // Update existing profile
      Object.assign(existingProfile, profileData);
      await existingProfile.save();
      return existingProfile.populate('userId', 'fullName email employeeCode department designation');
    } else {
      // Create new profile
      const newProfile = new UserProfile({
        userId,
        organizationCode,
        ...profileData
      });
      await newProfile.save();
      return newProfile.populate('userId', 'fullName email employeeCode department designation');
    }
  }

  /**
   * Update personal details
   */
  async updatePersonalDetails(
    userId: string, 
    personalDetails: Partial<IPersonalDetails>,
    organizationCode: string
  ): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      profile = new UserProfile({ userId, organizationCode });
    }
    
    profile.personalDetails = { ...profile.personalDetails, ...personalDetails };
    await profile.save();
    
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Add emergency contact
   */
  async addEmergencyContact(
    userId: string, 
    contactData: IEmergencyContact,
    organizationCode: string
  ): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      profile = new UserProfile({ userId, organizationCode });
    }
    
    // If this is primary, set others to false
    if (contactData.isPrimary) {
      profile.emergencyContacts = profile.emergencyContacts?.map(contact => ({
        ...contact,
        isPrimary: false
      })) || [];
    }
    
    profile.emergencyContacts = [...(profile.emergencyContacts || []), contactData];
    await profile.save();
    
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Update emergency contact
   */
  async updateEmergencyContact(
    userId: string, 
    contactIndex: number,
    contactData: Partial<IEmergencyContact>,
    organizationCode: string
  ): Promise<IUserProfile> {
    const profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      throw new ApiError('User profile not found', 404);
    }
    
    if (!profile.emergencyContacts || contactIndex >= profile.emergencyContacts.length) {
      throw new ApiError('Emergency contact not found', 404);
    }
    
    // If setting as primary, remove primary from others
    if (contactData.isPrimary) {
      profile.emergencyContacts = profile.emergencyContacts.map((contact, index) => ({
        ...contact,
        isPrimary: index === contactIndex
      }));
    } else {
      profile.emergencyContacts[contactIndex] = {
        ...profile.emergencyContacts[contactIndex],
        ...contactData
      };
    }
    
    await profile.save();
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Remove emergency contact
   */
  async removeEmergencyContact(
    userId: string, 
    contactIndex: number,
    organizationCode: string
  ): Promise<IUserProfile> {
    const profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      throw new ApiError('User profile not found', 404);
    }
    
    if (!profile.emergencyContacts || contactIndex >= profile.emergencyContacts.length) {
      throw new ApiError('Emergency contact not found', 404);
    }
    
    profile.emergencyContacts.splice(contactIndex, 1);
    await profile.save();
    
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Add education
   */
  async addEducation(
    userId: string, 
    educationData: IEducation,
    organizationCode: string
  ): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      profile = new UserProfile({ userId, organizationCode });
    }
    
    profile.education = [...(profile.education || []), educationData];
    await profile.save();
    
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Add work experience
   */
  async addWorkExperience(
    userId: string, 
    experienceData: IWorkExperience,
    organizationCode: string
  ): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      profile = new UserProfile({ userId, organizationCode });
    }
    
    profile.workExperience = [...(profile.workExperience || []), experienceData];
    await profile.save();
    
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Add skill
   */
  async addSkill(
    userId: string, 
    skillData: ISkill,
    organizationCode: string
  ): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      profile = new UserProfile({ userId, organizationCode });
    }
    
    profile.skills = [...(profile.skills || []), skillData];
    await profile.save();
    
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Update profile photo
   */
  async updateProfilePhoto(
    userId: string, 
    photoUrl: string,
    organizationCode: string
  ): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      profile = new UserProfile({ userId, organizationCode });
    }
    
    profile.profilePhoto = photoUrl;
    await profile.save();
    
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Update resume
   */
  async updateResume(
    userId: string, 
    fileName: string,
    fileUrl: string,
    organizationCode: string
  ): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      profile = new UserProfile({ userId, organizationCode });
    }
    
    profile.resume = {
      fileName,
      fileUrl,
      uploadedOn: new Date()
    };
    await profile.save();
    
    return profile.populate('userId', 'fullName email employeeCode department designation');
  }

  /**
   * Get incomplete profiles for organization
   */
  async getIncompleteProfiles(organizationCode: string): Promise<IUserProfile[]> {
    return UserProfile.find({
      organizationCode,
      $or: [
        { isProfileComplete: false },
        { completionPercentage: { $lt: 80 } }
      ]
    })
    .populate('userId', 'fullName email employeeCode department')
    .sort({ completionPercentage: 1 });
  }

  /**
   * Get profile statistics for organization
   */
  async getProfileStats(organizationCode: string) {
    const stats = await UserProfile.aggregate([
      { $match: { organizationCode } },
      {
        $group: {
          _id: null,
          totalProfiles: { $sum: 1 },
          completeProfiles: {
            $sum: { $cond: [{ $eq: ['$isProfileComplete', true] }, 1, 0] }
          },
          averageCompletion: { $avg: '$completionPercentage' },
          profilesWithPhoto: {
            $sum: { $cond: [{ $ne: ['$profilePhoto', null] }, 1, 0] }
          },
          profilesWithResume: {
            $sum: { $cond: [{ $ne: ['$resume.fileUrl', null] }, 1, 0] }
          }
        }
      }
    ]);

    const completionDistribution = await UserProfile.aggregate([
      { $match: { organizationCode } },
      {
        $bucket: {
          groupBy: '$completionPercentage',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
            profiles: {
              $push: {
                userId: '$userId',
                completionPercentage: '$completionPercentage'
              }
            }
          }
        }
      }
    ]);

    return {
      summary: stats[0] || {
        totalProfiles: 0,
        completeProfiles: 0,
        averageCompletion: 0,
        profilesWithPhoto: 0,
        profilesWithResume: 0
      },
      completionDistribution
    };
  }

  /**
   * Search profiles by various criteria
   */
  async searchProfiles(
    organizationCode: string,
    filters: ProfileFilters,
    page = 1,
    limit = 10,
    sortBy = 'completionPercentage',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const query: any = { organizationCode, ...filters };
    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [profiles, total] = await Promise.all([
      UserProfile.find(query)
        .populate('userId', 'fullName email employeeCode department designation')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      UserProfile.countDocuments(query)
    ]);

    return {
      profiles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Delete user profile
   */
  async deleteProfile(userId: string, organizationCode: string): Promise<void> {
    const profile = await UserProfile.findOne({ userId, organizationCode });
    
    if (!profile) {
      throw new ApiError('User profile not found', 404);
    }
    
    await UserProfile.findByIdAndDelete(profile._id);
  }
}

export default UserProfileService;