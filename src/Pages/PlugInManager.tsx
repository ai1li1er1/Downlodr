/* eslint-disable @typescript-eslint/no-explicit-any */
// src/Components/Pages/PluginManager.tsx
import React, { useEffect, useRef, useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiSearch } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import NoPlugin from '../Assets/Images/extension_light_nobg 1.svg';
import { Button } from '../Components/SubComponents/shadcn/components/ui/button';
import { toast } from '../Components/SubComponents/shadcn/hooks/use-toast';

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string;
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-darkModeDropdown rounded-lg border border-darkModeCompliment p-6 max-w-sm w-full mx-4">
        <p className="text-gray-800 dark:text-gray-200 mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-darkModeHover rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

const PluginManager: React.FC = () => {
  //Plugins
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledPlugins, setEnabledPlugins] = useState<Record<string, boolean>>(
    {},
  );
  // New state to track if directory selection is in progress
  const [isSelectingDirectory, setIsSelectingDirectory] =
    useState<boolean>(false);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pluginToRemove, setPluginToRemove] = useState<string | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<PluginInfo[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Helper function to check if string is SVG
  const isSvgString = (str: string): boolean => {
    if (typeof str !== 'string') return false;
    const trimmed = str.trim();
    return trimmed.startsWith('<svg') && trimmed.endsWith('</svg>');
  };

  // Helper function to get first paragraph of description
  const getFirstParagraph = (description: string): string => {
    if (!description) return '';

    // Split by double line breaks first (common paragraph separator)
    const paragraphs = description.split(/\n\s*\n/);
    if (paragraphs.length > 1 && paragraphs[0].trim()) {
      return paragraphs[0].trim();
    }

    // If no double line breaks, try single line breaks
    const lines = description.split('\n');
    if (lines.length > 1 && lines[0].trim()) {
      return lines[0].trim();
    }

    // If no line breaks, return the full description (will be truncated by CSS)
    return description;
  };

  // Render icon helper function
  const renderIcon = (icon: any, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'md' ? 'w-6 h-6' : 'w-5 h-5';

    if (typeof icon === 'string' && isSvgString(icon)) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: icon }}
          className={`${sizeClass} flex items-center justify-center rounded-sm [&>svg]:w-full [&>svg]:h-full`}
        />
      );
    } else if (icon) {
      return <span>{icon}</span>;
    } else {
      return (
        <div
          className={`${sizeClass} bg-gray-300 dark:bg-gray-600 rounded-sm flex items-center justify-center`}
        >
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
            P
          </span>
        </div>
      );
    }
  };

  // Filter search results when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const results = plugins.filter(
      (plugin) =>
        plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.author.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    setSearchResults(results);
  }, [searchTerm, plugins]);

  useEffect(() => {
    loadPlugins();
  }, []);

  // Load enabled plugins state
  useEffect(() => {
    const loadEnabledState = async () => {
      try {
        const enabledState = await window.plugins.getEnabledPlugins();
        setEnabledPlugins(enabledState || {});
      } catch (error) {
        console.error('Failed to load plugin enabled states:', error);
      }
    };

    loadEnabledState();
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const installedPlugins = await window.plugins.list();

      // Add this line to see what the plugin data contains
      console.log('Loaded plugins:', installedPlugins);

      setPlugins(installedPlugins);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (isSelectingDirectory) return;

    try {
      setIsSelectingDirectory(true);
      const pluginPath = await window.ytdlp.selectDownloadDirectory();
      if (pluginPath) {
        const result = await window.plugins.install(pluginPath);

        if (result === true) {
          // First reload the plugins in the main process
          await window.plugins.reload();
          // Then update the UI list
          await loadPlugins();
          toast({
            title: 'Success',
            description: 'Plugin was installed successfully',
            variant: 'success',
            duration: 3000,
          });
        } else if (
          typeof result === 'string' &&
          result === 'already-installed'
        ) {
          toast({
            title: 'Plugin Already Installed',
            description: 'This plugin is already installed',
            variant: 'default',
            duration: 3000,
          });
        } else {
          toast({
            title: 'Invalid Plugin Directory',
            description:
              'The selected directory does not contain a valid plugin structure',
            variant: 'destructive',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
      if (
        !error.message?.includes('Cannot read properties') &&
        !error.message?.includes('dialog:openDirectory')
      ) {
        toast({
          title: 'Installation Failed',
          description:
            error.message ||
            'An unexpected error occurred while installing the plugin',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } finally {
      setIsSelectingDirectory(false);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    setPluginToRemove(pluginId);
    setShowConfirmModal(true);
  };

  const confirmUninstall = async () => {
    if (!pluginToRemove) return;

    const plugin = plugins.find((p) => p.id === pluginToRemove);
    const pluginName = plugin ? plugin.name : 'this plugin';

    try {
      const success = await window.plugins.uninstall(pluginToRemove);
      if (success) {
        // First reload the plugins in the main process
        await window.plugins.reload();
        // Then update the UI list
        await loadPlugins();
        toast({
          title: 'Plugin Removed',
          description: `${pluginName} has been successfully removed`,
          variant: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Failed to Remove Plugin',
          description: `Could not remove ${pluginName}. Please try again.`,
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      toast({
        title: 'Error',
        description: `An error occurred while removing ${pluginName}`,
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setShowConfirmModal(false);
      setPluginToRemove(null);
    }
  };

  const cancelUninstall = () => {
    setShowConfirmModal(false);
    setPluginToRemove(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLoadUnzipped = async () => {
    try {
      const pluginDirPath = await window.ytdlp.selectDownloadDirectory();
      if (pluginDirPath) {
        const success = await window.plugins.loadUnzipped(pluginDirPath);
        if (success) {
          // First reload the plugins in the main process
          await window.plugins.reload();
          // Then update the UI list
          await loadPlugins();
        }
      }
    } catch (error) {
      console.error('Failed to load unzipped plugin:', error);
    }
  };

  // enable and disable toggle functionality
  const handleToggle = async (pluginId: string) => {
    try {
      const newState = !enabledPlugins[pluginId];

      // Update UI state immediately for responsive UX
      setEnabledPlugins((prev) => ({
        ...prev,
        [pluginId]: newState,
      }));

      // Save the state persistently
      const success = await window.plugins.setPluginEnabled(pluginId, newState);

      if (success) {
        console.log(`Plugin ${pluginId} ${newState ? 'enabled' : 'disabled'}`);
      } else {
        // Revert UI state if the operation failed
        setEnabledPlugins((prev) => ({
          ...prev,
          [pluginId]: !newState,
        }));
        console.error(`Failed to update plugin state for ${pluginId}`);
      }
    } catch (error) {
      console.error(`Error toggling plugin ${pluginId}:`, error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBFBFB] dark:bg-darkModeDropdown">
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={cancelUninstall}
        onConfirm={confirmUninstall}
        message={`Are you sure you want to remove "${
          pluginToRemove
            ? plugins.find((p) => p.id === pluginToRemove)?.name ||
              'this plugin'
            : 'this plugin'
        }"? This action cannot be undone.`}
      />
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          {/* Directory selection overlay - blocks all app interaction */}
          {isSelectingDirectory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] cursor-not-allowed flex items-center justify-center">
              <div className="bg-white dark:bg-darkMode p-4 rounded-md shadow-lg max-w-md text-center">
                <h3 className="text-lg font-medium mb-2 dark:text-gray-200">
                  Directory Selection In Progress
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Please complete the directory selection dialog before
                  continuing.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-medium mr-4">Plugins</h1>
            {/* Search Bar with increased width */}
            <div ref={searchRef} className="relative">
              <div className="flex items-center bg-[#FFFFFF] dark:bg-darkModeDropdown rounded-md border dark:border-2 border-[#D1D5DB] dark:border-darkModeCompliment px-2">
                <FiSearch className="text-gray-500 dark:text-gray-400 h-4 w-4 mr-1" />
                <input
                  type="text"
                  placeholder="Search"
                  className="py-1 px-2 bg-transparent focus:outline-none text-sm w-full"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowResults(e.target.value.trim() !== '');
                  }}
                  onFocus={() => {
                    if (searchTerm.trim() !== '') {
                      setShowResults(true);
                    }
                  }}
                />
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-darkModeCompliment rounded-md shadow-lg z-10">
                  {searchResults.map((plugin) => (
                    <NavLink
                      key={plugin.id}
                      to="/plugins/details"
                      state={{ plugin }}
                      className="block px-3 py-2 hover:bg-gray-100 dark:hover:bg-darkModeHover cursor-pointer text-sm"
                      onClick={() => setShowResults(false)}
                    >
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center w-5 h-5 mr-2 flex-shrink-0">
                          {renderIcon(plugin.icon)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-medium truncate"
                            title={plugin.name}
                          >
                            {plugin.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {getFirstParagraph(plugin.description)}
                          </div>
                        </div>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}

              {/* No Results Message */}
              {showResults &&
                searchTerm.trim() !== '' &&
                searchResults.length === 0 && (
                  <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-darkModeCompliment rounded-md shadow-lg z-10">
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No plugins found
                    </div>
                  </div>
                )}
            </div>
          </div>
          {plugins.length > 0 && (
            <div className="flex items-center">
              <Button
                onClick={handleInstall}
                className="bg-[#F45513] px-4 py-1 h-8 ml-4"
              >
                <FaPlus />
                <span>Add Plugin</span>
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div>Loading plugins...</div>
        ) : plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-gray-500 p-8 min-h-[60vh]">
            <img
              src={NoPlugin}
              alt="No plugins available"
              className="mx-auto"
            />
            <span className="mx-auto mt-8 dark:text-gray-200">
              You haven't installed any plugins
            </span>
            <Button
              onClick={handleInstall}
              className="bg-[#F45513] px-4 py-1 h-8 mt-2"
            >
              <FaPlus />
              <span>Add Plugin</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className="w-sm bg-[#FFFFFF] dark:bg-darkMode rounded-sm p-4 shadow-sm ring-1 ring-gray-200 dark:ring-darkModeCompliment border-l-4 border-l-[#FFFFFF] dark:border-l-4 dark:border-l-darkMode hover:border-l-4 hover:border-l-[#F45513] hover:dark:border-l-[#F45513] h-58 flex flex-col"
              >
                <div className="flex-1 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 mr-2 flex-shrink-0">
                        {renderIcon(plugin.icon, 'md')}
                      </span>
                      <h3 className="text-lg text-[14px] font-bold truncate">
                        {plugin.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm line-clamp-3 overflow-hidden h-16">
                      {getFirstParagraph(plugin.description)}
                    </p>
                  </div>
                  <hr className="solid my-4 w-full border-t border-divider dark:border-darkModeCompliment" />
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex gap-2 flex-wrap ">
                      <NavLink to="/plugins/details" state={{ plugin }}>
                        <Button
                          variant="outline"
                          className="dark:border-darkModeCompliment border-2 py-4 px-2 h-8 dark:hover:bg-darkModeDropdown dark:bg-darkModeDropdown hover:text-primary dark:hover:text-primary"
                        >
                          Details
                        </Button>
                      </NavLink>
                      <Button
                        variant="outline"
                        className="border-2 py-4 px-2 h-8 dark:hover:bg-darkModeDropdown dark:bg-darkModeDropdown hover:text-primary dark:hover:text-primary"
                        onClick={() => handleUninstall(plugin.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={enabledPlugins[plugin.id] || false}
                          onChange={() => handleToggle(plugin.id)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginManager;
