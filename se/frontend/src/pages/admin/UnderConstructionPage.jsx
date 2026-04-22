import React from 'react';
import { FiTool } from 'react-icons/fi';
import { EmptyState, PageHeader } from '../../components/common/index.jsx';

export default function UnderConstructionPage({ title = 'Module', description = 'This workflow is not ready yet.' }) {
  return (
    <div className="float-in">
      <PageHeader title={title} subtitle="This module is not yet enabled for live school operations." />
      <div className="campus-panel">
        <EmptyState
          icon={FiTool}
          title={`${title} Is Under Construction`}
          description={description}
        />
      </div>
    </div>
  );
}
