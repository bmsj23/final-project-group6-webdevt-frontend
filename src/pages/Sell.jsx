import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import BecomeSellerModal from '../components/seller/BecomeSellerModal';
import Button from '../components/common/Button';
import { Package, TrendingUp, Users, Shield } from 'lucide-react';

function Sell() {
  const navigate = useNavigate();
  const { isSeller, updateUser } = useAuth();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isSeller) {
      navigate('/seller/products/');
    }
  }, [isSeller, navigate]);

  const handleSellerSuccess = (data) => {
    const updatedUser = data.data || data;
    updateUser(updatedUser);
    showToast('You are now a seller!', 'success');
    navigate('/seller/products/');
  };

  const benefits = [
    {
      icon: Package,
      title: 'Easy Listing',
      description: 'Create And Manage Your Product Listings With Our Simple Interface'
    },
    {
      icon: TrendingUp,
      title: 'Reach More Buyers',
      description: 'Connect With The Entire DLSL Community Looking For Quality Items'
    },
    {
      icon: Users,
      title: 'Trusted Community',
      description: 'Sell To Verified DLSL Students And Faculty Members'
    },
    {
      icon: Shield,
      title: 'Secure Transactions',
      description: 'Safe And Reliable Platform For Campus Marketplace'
    }
  ];

  if (isSeller) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Start Selling on AnimoMart</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join our community of student sellers and turn your unused items into cash!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <benefit.icon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to become a Seller?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Complete a Quick Registration to Start Listing Your Items and Reaching Potential Buyers
          </p>
          <Button
            onClick={() => setShowModal(true)}
            size="lg"
            className="hover:cursor-pointer"
          >
            Get Started
          </Button>
        </div>
      </div>

      {showModal && (
        <BecomeSellerModal 
          isOpen={true} 
          onClose={() => setShowModal(false)} 
          onSuccess={handleSellerSuccess}
        />
      )}
    </div>
  );
}

export default Sell;