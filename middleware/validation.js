const Joi = require('joi');


//Login validation schema
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
        'string.password': 'Password must be at least 8 characters long',
        'any.required': 'password is required'
    }),

});

//Moderator validation schema
const createModeratorSchema = Joi.object({
  email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.requird': 'Email is required'
  }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.[A-Z])(?=.*\\d)')).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'password must be at least one uppercase, one lowercase, one number and one special character',
        'any.required': 'Password is required'
    }),
    role: Joi.string().valid('moderator', 'admin').default('moderator').messages({
        'any.only': 'Role must be either moderator or admin'
    })
});


// Update User validation schema
const updateUserSchema = Joi.object({
    email: Joi.string().email().messages({
        'string.email': "please provide a valid email address"
    }),
    is_active: Joi.boolean(),
    role: Joi.string().valid('moderator', 'admin').messages({
        'any.only': 'Role must be either moderator or admin'
    })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false});


        if (error) {
            const errors = error.detauls.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        req.validatedData = value;
        next();
    };
};

module.exports = {
    validateLogin: validate(loginSchema),
    validateCreateModerator: validate(createModeratorSchema),
    validateUpdateUser: validate(updateUserSchema),
};





