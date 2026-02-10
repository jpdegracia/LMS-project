import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Import useParams
import UserContext from '../../UserContext/UserContext';


const CreateUserPage = () => { // Renamed from CreateUserForm to CreateUser
  const { hasPermission } = useContext(UserContext);
  const navigate = useNavigate();
  const { roleType } = useParams(); // Get roleType from URL parameters (e.g., 'teacher', 'student')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    IDnumber: '',
    roleName: roleType || '', // Initialize roleName from URL param or empty if not present
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false); // For form submission loading state

  // Effect to set roleName from URL param when component mounts or param changes
  useEffect(() => {
    if (roleType) {
      // Validate roleType if needed, e.g., only 'teacher' and 'student' allowed here
      const validRoleTypes = ['teacher', 'student', 'admin', 'user', 'generic']; // Include all roles allowed via this form
      if (validRoleTypes.includes(roleType.toLowerCase())) {
        setFormData(prev => ({ ...prev, roleName: roleType.toLowerCase() }));
      } else {
        // If an invalid roleType is in the URL, set an error or default
        setGeneralError(`Invalid role type in URL: "${roleType}". Please use a valid role.`);
        setFormData(prev => ({ ...prev, roleName: '' })); // Clear or set default
      }
    }
  }, [roleType]); // Re-run if roleType param changes

  // Early exit if user doesn't have permission
  if (!hasPermission('user:create')) {
    return <div className="text-red-600 text-center mt-10 font-semibold">You do not have permission to create users.</div>;
  }

  // Clear messages after a short delay
  useEffect(() => {
    if (successMessage || generalError) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setGeneralError(null);
        setErrors({});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, generalError]);


  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) { setErrors(prev => ({ ...prev, [name]: null })); }
    if (generalError) { setGeneralError(null); }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (!formData.firstName.trim()) { newErrors.firstName = 'First Name is required.'; isValid = false; }
    if (!formData.lastName.trim()) { newErrors.lastName = 'Last Name is required.'; isValid = false; }
    if (!formData.email.trim()) { newErrors.email = 'Email is required.'; isValid = false; } 
    else if (!/\S+@\S+\.\S+/.test(formData.email)) { newErrors.email = 'Invalid email address format.'; isValid = false; }
    if (!formData.password) { newErrors.password = 'Password is required.'; isValid = false; } 
    else if (formData.password.length < 8) { newErrors.password = 'Password must be at least 8 characters long.'; isValid = false; }
    
    // Role validation: if roleType is in URL, it's considered fixed. If not, validate the input field.
    if (!roleType && !formData.roleName.trim()) { // If no roleType in URL, and input field is empty
      newErrors.roleName = 'Role is required.';
      isValid = false;
    } else if (roleType && !['teacher', 'student', 'admin', 'user', 'generic'].includes(roleType.toLowerCase())) {
        // If roleType is provided but it's an invalid type
        newErrors.roleName = `Invalid pre-defined role type "${roleType}".`;
        isValid = false;
    }


    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setGeneralError(null);
    setErrors({});
    setSuccessMessage(null);

    if (!validateForm()) { return; }

    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        IDnumber: formData.IDnumber || undefined,
        // Send the roleName from state, which is either from URL param or typed by admin
        roleNames: [formData.roleName.toLowerCase()], 
      };

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 409 && data.message.includes("Email already exists")) {
            setErrors(prev => ({ ...prev, email: data.message }));
        } else if (response.status === 400 && data.message.includes("Password must be at least 8 characters long")) {
            setErrors(prev => ({ ...prev, password: data.message }));
        } else if (response.status === 400 && data.message.includes("role") && data.message.includes("found")) {
            setErrors(prev => ({ ...prev, roleName: data.message }));
        } else {
            setGeneralError(data.message || 'Failed to create user. Please check form inputs.');
        }
        return;
      }

      setSuccessMessage('User created successfully! A verification email has been sent to the new user. Redirecting...');
      setFormData({ firstName: '', lastName: '', email: '', password: '', IDnumber: '', roleName: roleType || '' }); // Reset roleName based on initial param

      setTimeout(() => { navigate('/user-management'); }, 3000); 

    } catch (err) {
      console.error("Error creating user:", err);
      setGeneralError('An unexpected network error occurred during user creation.');
    } finally {
      setLoading(false);
    }
  };

  // Determine if the role input should be disabled (if roleType is present in URL)
  const isRoleInputDisabled = !!roleType; 
  const displayRoleName = roleType ? roleType.charAt(0).toUpperCase() + roleType.slice(1) : formData.roleName;


  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-3xl drop-shadow-2xl mt-8">
      <h2 className="text-center text-3xl form-secondary font-bold text-gray-700 mb-4">Create New {displayRoleName || 'User'}</h2>

      {generalError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {generalError}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="status">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-gray-700 font-medium">
            First Name:<span className="text-red-500">*</span>
          </label>
          <input type="text" id="firstName" name="firstName" required value={formData.firstName} onChange={handleChange} className={`mt-1 p-2 w-full border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-500' : ''}`} />
          {errors.firstName && <p className="text-red-500 text-xs italic">{errors.firstName}</p>}
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-gray-700 font-medium">
            Last Name:<span className="text-red-500">*</span>
          </label>
          <input type="text" id="lastName" name="lastName" required value={formData.lastName} onChange={handleChange} className={`mt-1 p-2 w-full border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-500' : ''}`} />
          {errors.lastName && <p className="text-red-500 text-xs italic">{errors.lastName}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-gray-700 font-medium">
            Email:<span className="text-red-500">*</span>
          </label>
          <input type="email" id="email" name="email" required value={formData.email} onChange={handleChange} className={`mt-1 p-2 w-full border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`} />
          {errors.email && <p className="text-red-500 text-xs italic">{errors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-gray-700 font-medium">
            Password:<span className="text-red-500">*</span>
          </label>
          <input type="password" id="password" name="password" required value={formData.password} onChange={handleChange} className={`mt-1 p-2 w-full border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : ''}`} />
          {errors.password && <p className="text-red-500 text-xs italic">{errors.password}</p>}
        </div>

        {/* ID Number */}
        <div>
          <label htmlFor="IDnumber" className="block text-gray-700 font-medium">
            ID Number:
          </label>
          <input type="text" id="IDnumber" name="IDnumber" value={formData.IDnumber} onChange={handleChange} placeholder="Enter ID Number (optional)" className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Role Selection Field */}
        <div>
          <label htmlFor="roleName" className="block text-gray-700 font-medium">
            Role:<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="roleName"
            name="roleName"
            required
            value={displayRoleName} // Display capitalized role name
            onChange={handleChange}
            placeholder="e.g. admin, teacher, student"
            className={`mt-1 p-2 w-full border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.roleName ? 'border-red-500' : ''}`}
            disabled={isRoleInputDisabled || loading} // Disabled if roleType is in URL or form is loading
          />
          {errors.roleName && <p className="text-red-500 text-xs italic">{errors.roleName}</p>}
        </div>

        <div className="flex items-center justify-end gap-5 mt-6">
          <button
            type="button"
            onClick={() => navigate('/user-management')}
            disabled={loading || successMessage}
            className="btn-cancel"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || successMessage}
            className="btn-create"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserPage;