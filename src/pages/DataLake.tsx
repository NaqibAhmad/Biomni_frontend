import { useState, useEffect } from "react";
import {
  Database,
  Search,
  Plus,
  FileText,
  Download,
  Trash2,
} from "lucide-react";
import { useAgentStore } from "@/store/agentStore";
import { UploadDataModal } from "@/components/modals/UploadDataModal";
import toast from "react-hot-toast";

export function DataLake() {
  const {
    dataLake,
    customData,
    isLoadingData,
    loadDataLake,
    removeCustomData,
    loadCustomResources,
  } = useAgentStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoadingCustomData, setIsLoadingCustomData] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      console.log("[DataLake] useEffect: Starting loadData");
      setIsLoadingCustomData(true);
      try {
        if (dataLake.length === 0) {
          console.log("[DataLake] Loading dataLake...");
          await loadDataLake();
        }
        // Always load custom resources to ensure tags are available
        console.log("[DataLake] Calling loadCustomResources...");
        const result = await loadCustomResources();
        console.log(
          "[DataLake] loadCustomResources completed, result:",
          result
        );
        // Force a small delay to ensure store is updated
        await new Promise((resolve) => setTimeout(resolve, 50));
        // Get fresh state from store
        const storeState = useAgentStore.getState();
        console.log(
          "[DataLake] After delay, customData from store:",
          storeState.customData
        );
      } catch (error) {
        console.error("[DataLake] Error in loadData:", error);
      } finally {
        setIsLoadingCustomData(false);
        console.log("[DataLake] loadData completed");
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLake.length]); // Only depend on dataLake.length to avoid infinite loops

  // Force re-render when customData changes
  useEffect(() => {
    console.log("[DataLake] customData changed, count:", customData.length);
  }, [customData]);

  // Combine data, prioritizing customData items (which have tags) over dataLake items with same name
  const dataLakeMap = new Map(dataLake.map((item) => [item.name, item]));
  const customDataMap = new Map(customData.map((item) => [item.name, item]));

  // Debug: Log customData to see if tags are present
  console.log("[DataLake] customData count:", customData.length);
  console.log(
    "[DataLake] customData array:",
    JSON.stringify(customData, null, 2)
  );
  if (customData.length > 0) {
    console.log(
      "[DataLake] First customData item:",
      JSON.stringify(customData[0], null, 2)
    );
  }
  console.log(
    "[DataLake] customData items with tags:",
    customData.filter(
      (item) => item.tags && Array.isArray(item.tags) && item.tags.length > 0
    )
  );

  // Merge: customData items take precedence, then add dataLake items that aren't in customData
  const customDataItems = Array.from(customDataMap.values());
  const dataLakeOnlyItems = Array.from(dataLakeMap.values()).filter(
    (item) => !customDataMap.has(item.name)
  );
  const allData = [...customDataItems, ...dataLakeOnlyItems];

  console.log("[DataLake] allData count:", allData.length);
  console.log("[DataLake] customDataItems count:", customDataItems.length);
  console.log(
    "[DataLake] customDataItems with tags:",
    customDataItems.filter(
      (item) =>
        (item as any).tags &&
        Array.isArray((item as any).tags) &&
        (item as any).tags.length > 0
    )
  );

  const filteredData = allData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Lake</h1>
          <p className="text-gray-600">
            Access biological datasets and resources
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Data
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search datasets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10 w-full max-w-md"
        />
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingData || isLoadingCustomData ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading datasets...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No datasets found</p>
          </div>
        ) : (
          filteredData.map((item) => {
            // Check if this item is in customDataMap (which means it has tags)
            const customDataItem = customDataMap.get(item.name);
            const isCustomDataItem = !!customDataItem;

            // Get tags - first try from customDataItem, then from item itself
            // Items from customDataItems should already have tags property
            let tags: string[] = [];

            // First, try to get tags from the customDataItem in the map
            if (customDataItem?.tags && Array.isArray(customDataItem.tags)) {
              tags = customDataItem.tags.filter(
                (tag: string) => tag && tag.trim() !== ""
              );
            }

            // If no tags found, check if the item itself has tags (for items already from customData)
            if (
              tags.length === 0 &&
              (item as any).tags &&
              Array.isArray((item as any).tags)
            ) {
              tags = (item as any).tags.filter(
                (tag: string) => tag && tag.trim() !== ""
              );
            }

            // Debug: Log items with tags to console
            if (tags && Array.isArray(tags) && tags.length > 0) {
              console.log(
                "[DataLake] Rendering item with tags:",
                item.name,
                "tags:",
                tags,
                "customDataItem:",
                customDataItem
              );
            } else if (isCustomDataItem) {
              console.log(
                "[DataLake] Custom item without tags:",
                item.name,
                "customDataItem tags field:",
                customDataItem?.tags,
                "customDataItem full:",
                JSON.stringify(customDataItem, null, 2)
              );
            }

            return (
              <div key={item.name} className="card">
                <div className="card-content">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </button>
                      {isCustomDataItem && (
                        <button
                          onClick={async () => {
                            if (
                              !confirm(
                                `Are you sure you want to delete "${item.name}"?`
                              )
                            ) {
                              return;
                            }
                            try {
                              await removeCustomData(item.name);
                              toast.success("File deleted successfully");
                              // Reload custom resources to refresh the list
                              await loadCustomResources();
                            } catch (error: any) {
                              console.error("Failed to delete file:", error);
                              toast.error(
                                error.message || "Failed to delete file"
                              );
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-error-600"
                          title="Delete custom data"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-medium text-gray-900 mb-2">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {item.description}
                  </p>

                  {/* Display Tags */}
                  {tags && Array.isArray(tags) && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {isCustomDataItem ? "Custom" : "Built-in"}
                    </span>
                    {item.path && (
                      <span className="text-xs text-gray-500 truncate">
                        {item.path}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={async () => {
          setIsUploadModalOpen(false);
          // Reload custom data to get updated tags
          await loadCustomResources();
        }}
      />
    </div>
  );
}
