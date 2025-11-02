// middleware/validation.js
export const validateWorkflowRequest = (req, res, next) => {
  const { requirements, methodology, complianceFramework } = req.body;

  const errors = [];

  // Validate requirements
  if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
    errors.push('Requirements array is required and must not be empty');
  }

  if (requirements && requirements.length > 100) {
    errors.push('Too many requirements. Maximum 100 allowed.');
  }

  // Validate methodology
  const validMethodologies = ['agile', 'waterfall', 'hybrid'];
  if (methodology && !validMethodologies.includes(methodology.toLowerCase())) {
    errors.push(`Invalid methodology. Must be one of: ${validMethodologies.join(', ')}`);
  }

  // Validate compliance framework
  const validFrameworks = ['HIPAA', 'GDPR', 'PIPEDA', 'SOX', 'FDA-21-CFR-11', 'HITRUST', 'ISO-13485', 'SOC2'];
  if (complianceFramework && !validFrameworks.includes(complianceFramework.toUpperCase())) {
    errors.push(`Invalid compliance framework. Must be one of: ${validFrameworks.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors,
      message: 'Validation failed'
    });
  }

  next();
};