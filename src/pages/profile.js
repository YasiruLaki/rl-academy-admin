import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/sidebar';
import './profile.css';
import { firestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import LoadingScreen from '../components/loadingScreen';

const Profile = () => {
    const { currentUser, resetPassword, logout } = useAuth();
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            const fetchUserData = async () => {
                setLoading(true);
                try {
                    const userRef = doc(firestore, 'mentors', currentUser.email);
                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        // Convert comma-separated string to array
                        if (data.courses) {
                            data.courses = data.courses.split(',').map(course => course.trim());
                        }
                        setUserData(data);
                    } else {
                        setError('User data not found.');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setError('Failed to fetch user data. Please try again.');
                } finally {
                    setLoading(false);
                }
            };

            fetchUserData();
        }
    }, [currentUser]);

    const handlePasswordReset = async () => {
        setLoading(true);
        try {
            await resetPassword(currentUser.email);
            setError('');
            alert('Password reset email sent successfully!');
        } catch (error) {
            setError(error.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            await logout();
            setError('');
            window.location.href = '/';
        } catch (error) {
            setError(error.message || 'Failed to log out. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {loading && <LoadingScreen />}
            <Sidebar />
            <div className='profile'>
                <div className='profile-card-profile'>
                    <div className='profile-profile-pic'>
                        <button className='profile-profile-pic-btn'>Change Picture</button>
                    </div>
                    <div className='profile-profile-txt'>
                        {userData ? (
                            <>
                                <h3>{userData.Name}</h3>
                                <p className='except'>{userData.role} ({userData.Id})</p>
                                <div className='profile-card-courses'>
                                    <ul>
                                        {userData.courses.map((course, index) => (
                                            <li key={index}>
                                               <div> <p className='course'>{course}</p></div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <h4>Email:</h4>
                                <p className='data'>{currentUser.email}</p>
                                <h4>Whatsapp no:</h4>
                                <p className='data'>{userData.Whatsapp}</p>
                                <div className='passwrd-reset'>
                                    <button className='reset' onClick={handlePasswordReset} disabled={loading}>
                                        {loading ? 'Sending' : 'Send Password Reset Email'}
                                    </button>
                                    <button className='log-out' onClick={handleLogout} disabled={loading}>
                                        {loading ? 'Logging Out' : 'Logout'}
                                    </button>
                                    {error && <p>{error}</p>}
                                </div>
                            </>
                        ) : (
                            <p>Loading user data...</p> // You can replace this with a loading state
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
