// client/src/components/QueryTemplateForm.jsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Button, 
  TextField, 
  MenuItem, 
  Grid,
  Typography,
  Box
} from '@mui/material';
import { FaSearch } from 'react-icons/fa';

function QueryTemplateForm({ template, initialValues = {}, onSubmit }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialValues
  });

  // Reset form when template changes
  useEffect(() => {
    reset(initialValues);
  }, [template, initialValues, reset]);

  if (!template) {
    return null;
  }

  // Parse parameter schema
  const paramSchema = template.parameter_schema || {};
  const properties = paramSchema.properties || {};
  const required = paramSchema.required || [];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={3}>
        {Object.entries(properties).map(([name, schema]) => {
          const isRequired = required.includes(name);
          
          // Determine field type based on schema
          let fieldType = 'text';
          if (schema.type === 'number') {
            fieldType = 'number';
          }
          
          // Handle different field types
          if (schema.enum) {
            // Select field for enum values
            return (
              <Grid item xs={12} md={6} key={name}>
                <TextField
                  select
                  label={schema.description || name}
                  fullWidth
                  required={isRequired}
                  error={!!errors[name]}
                  helperText={errors[name]?.message}
                  {...register(name, { 
                    required: isRequired ? 'This field is required' : false
                  })}
                >
                  {schema.enum.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            );
          } else {
            // Regular text or number field
            return (
              <Grid item xs={12} md={6} key={name}>
                <TextField
                  type={fieldType}
                  label={schema.description || name}
                  fullWidth
                  required={isRequired}
                  error={!!errors[name]}
                  helperText={errors[name]?.message}
                  InputProps={{
                    endAdornment: schema.type === 'number' && 
                      schema.description?.includes('square feet') ? 
                      'sq ft' : undefined
                  }}
                  {...register(name, {
                    required: isRequired ? 'This field is required' : false,
                    valueAsNumber: schema.type === 'number'
                  })}
                />
              </Grid>
            );
          }
        })}
      </Grid>
      
      <Box sx={{ mt: 3 }}>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          startIcon={<FaSearch />}
        >
          Search Properties
        </Button>
      </Box>
    </form>
  );
}

export default QueryTemplateForm;