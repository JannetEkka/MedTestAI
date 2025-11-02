// services/GapAnalysisService.js - UPDATED FOR VERTEX AI
import { VertexAI } from '@google-cloud/vertexai';

class GapAnalysisService {
  constructor() {
    this.vertex = null;
    this.model = null;
  }

  async initialize() {
    if (this.model) return;

    try {
      this.vertex = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'pro-variety-472211-b9',
        location: 'us-central1'
      });

      this.model = this.vertex.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      });

      console.log('✅ [GAP ANALYSIS] Vertex AI initialized');
    } catch (error) {
      console.error('❌ [GAP ANALYSIS] Vertex AI initialization failed:', error);
    }
  }

  async analyzeGaps(requirements, existingTestCases, complianceFrameworks) {
    console.log('🔍 [GAP ANALYSIS] Starting gap analysis...');
    console.log(`Requirements: ${requirements.length}`);
    console.log(`Existing Tests: ${existingTestCases.length}`);

    // Build coverage map
    const coverageMap = this.buildCoverageMap(requirements, existingTestCases);

    // Identify completely uncovered requirements
    const uncoveredRequirements = this.findUncoveredRequirements(coverageMap);

    // Identify partially covered requirements
    const partiallyCoveredRequirements = this.findPartialCoverage(coverageMap);

    // Use AI to identify implicit gaps
    const implicitGaps = await this.findImplicitGaps(
      requirements,
      existingTestCases,
      complianceFrameworks
    );

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      uncoveredRequirements,
      partiallyCoveredRequirements,
      implicitGaps,
      complianceFrameworks
    );

    return {
      summary: {
        totalRequirements: requirements.length,
        fullyTested: coverageMap.filter(r => r.coverage === 100).length,
        partiallyTested: partiallyCoveredRequirements.length,
        untested: uncoveredRequirements.length,
        coveragePercentage: this.calculateOverallCoverage(coverageMap)
      },
      gaps: {
        uncovered: uncoveredRequirements,
        partialCoverage: partiallyCoveredRequirements,
        implicit: implicitGaps
      },
      recommendations,
      riskAssessment: this.assessRisk(uncoveredRequirements, complianceFrameworks)
    };
  }

  buildCoverageMap(requirements, testCases) {
    return requirements.map(req => {
      const relatedTests = testCases.filter(test =>
        this.testCoversRequirement(test, req)
      );

      return {
        requirement: req,
        coveredBy: relatedTests,
        coverage: this.calculateCoverageScore(req, relatedTests)
      };
    });
  }

  testCoversRequirement(test, requirement) {
    const reqText = (requirement.text || requirement).toLowerCase();
    const testText = (test.description || test.title || '').toLowerCase();
    const testSteps = (test.steps || []).join(' ').toLowerCase();

    // Simple keyword matching (can be enhanced with semantic similarity)
    const keywords = this.extractKeywords(reqText);
    const matchCount = keywords.filter(keyword =>
      testText.includes(keyword) || testSteps.includes(keyword)
    ).length;

    return matchCount / keywords.length > 0.3; // 30% keyword match threshold
  }

  extractKeywords(text) {
    // Remove common words and extract meaningful keywords
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
    
    return [...new Set(words)]; // Remove duplicates
  }

  calculateCoverageScore(requirement, relatedTests) {
    if (relatedTests.length === 0) return 0;
    
    // Calculate coverage based on test comprehensiveness
    const hasPositiveTest = relatedTests.some(t => t.type === 'positive');
    const hasNegativeTest = relatedTests.some(t => t.type === 'negative');
    const hasEdgeCase = relatedTests.some(t => t.type === 'edge_case');
    
    let score = 0;
    if (hasPositiveTest) score += 40;
    if (hasNegativeTest) score += 40;
    if (hasEdgeCase) score += 20;
    
    return Math.min(100, score + (relatedTests.length * 5)); // Bonus for multiple tests
  }

  findUncoveredRequirements(coverageMap) {
    return coverageMap
      .filter(item => item.coverage === 0)
      .map(item => ({
        requirement: item.requirement,
        reason: 'No test cases cover this requirement',
        severity: 'HIGH'
      }));
  }

  findPartialCoverage(coverageMap) {
    return coverageMap
      .filter(item => item.coverage > 0 && item.coverage < 80)
      .map(item => ({
        requirement: item.requirement,
        coverage: item.coverage,
        coveredBy: item.coveredBy.length,
        missingAspects: this.identifyMissingAspects(item),
        severity: 'MEDIUM'
      }));
  }

  identifyMissingAspects(coverageItem) {
    const aspects = [];
    
    if (!coverageItem.coveredBy.some(t => t.type === 'positive')) {
      aspects.push('Positive/happy path testing');
    }
    if (!coverageItem.coveredBy.some(t => t.type === 'negative')) {
      aspects.push('Negative/error case testing');
    }
    if (!coverageItem.coveredBy.some(t => t.type === 'edge_case')) {
      aspects.push('Edge case testing');
    }
    if (!coverageItem.coveredBy.some(t => t.category === 'security')) {
      aspects.push('Security testing');
    }
    
    return aspects;
  }

  async findImplicitGaps(requirements, testCases, complianceFrameworks) {
    // Initialize if not already done
    if (!this.model) {
      await this.initialize();
    }

    if (!this.model) {
      console.warn('⚠️ [GAP ANALYSIS] Vertex AI not available, skipping implicit gap analysis');
      return [];
    }

    const prompt = `You are a healthcare QA expert. Analyze the following requirements and test cases to identify IMPLICIT testing gaps.

Requirements:
${requirements.map((r, i) => `${i + 1}. ${r.text || r}`).join('\n')}

Existing Test Cases:
${testCases.map((t, i) => `${i + 1}. ${t.title} - ${t.description}`).join('\n')}

Compliance Frameworks: ${complianceFrameworks.join(', ')}

Identify implicit gaps such as:
1. Missing integration tests between components
2. Lack of performance/load testing
3. Missing compliance-specific test scenarios
4. Insufficient error handling coverage
5. Missing accessibility tests
6. Lack of data validation tests
7. Missing audit trail verification

Return JSON array of implicit gaps with structure:
{
  "type": "integration|performance|compliance|error_handling|accessibility|validation|audit",
  "description": "detailed description",
  "severity": "HIGH|MEDIUM|LOW",
  "recommendation": "specific action to address"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                       text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const gapsData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return Array.isArray(gapsData) ? gapsData : [gapsData];
      }
      
      return [];
    } catch (error) {
      console.error('❌ [GAP ANALYSIS] Error finding implicit gaps:', error);
      return [];
    }
  }

  async generateRecommendations(uncovered, partial, implicit, complianceFrameworks) {
    const recommendations = [];

    // Priority 1: Uncovered requirements
    uncovered.forEach(gap => {
      recommendations.push({
        priority: 1,
        type: 'uncovered_requirement',
        requirement: gap.requirement,
        action: `Create test cases to cover: ${gap.requirement.text || gap.requirement}`,
        estimatedTests: 3 // Positive, negative, edge case
      });
    });

    // Priority 2: Partial coverage
    partial.forEach(gap => {
      recommendations.push({
        priority: 2,
        type: 'partial_coverage',
        requirement: gap.requirement,
        action: `Enhance coverage for: ${gap.requirement.text || gap.requirement}`,
        missingAspects: gap.missingAspects,
        estimatedTests: gap.missingAspects.length
      });
    });

    // Priority 3: Implicit gaps
    implicit.forEach(gap => {
      recommendations.push({
        priority: gap.severity === 'HIGH' ? 1 : gap.severity === 'MEDIUM' ? 2 : 3,
        type: 'implicit_gap',
        gapType: gap.type,
        description: gap.description,
        action: gap.recommendation
      });
    });

    // Sort by priority
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  calculateOverallCoverage(coverageMap) {
    if (coverageMap.length === 0) return 0;
    
    const totalCoverage = coverageMap.reduce((sum, item) => sum + item.coverage, 0);
    return Math.round(totalCoverage / coverageMap.length);
  }

  assessRisk(uncoveredRequirements, complianceFrameworks) {
    const risks = [];

    uncoveredRequirements.forEach(gap => {
      const reqText = (gap.requirement.text || gap.requirement).toLowerCase();
      
      // High risk keywords
      const highRiskKeywords = ['security', 'authentication', 'authorization', 'phi', 
                                'patient data', 'encryption', 'audit', 'compliance'];
      
      if (highRiskKeywords.some(keyword => reqText.includes(keyword))) {
        risks.push({
          requirement: gap.requirement,
          riskLevel: 'CRITICAL',
          reason: 'Security or compliance-related requirement without test coverage',
          impactedFrameworks: complianceFrameworks
        });
      }
    });

    return risks;
  }
}

export default new GapAnalysisService();