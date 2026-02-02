import { Menu, Bell, RefreshCw } from 'lucide-react';

export function Header({
    title,
    icon: Icon,
    onMenuClick,
    searchValue,
    onSearchChange,
    showSearch = true,
    filters = null,
    activeFilter = 'all',
    onFilterChange = null,
    filterCounts = null
}) {
    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <header className="header">
            <div className="header__left">
                <button className="header__menu-btn" onClick={onMenuClick}>
                    <Menu size={24} />
                </button>
                {Icon && <div className="header__icon"><Icon size={24} /></div>}
                <h1 className="header__title">{title}</h1>
            </div>

            <div className="header__right">
                {/* Filter Buttons */}
                {filters && onFilterChange && (
                    <div className="header__filters">
                        {filters.map(filter => (
                            <button
                                key={filter.key}
                                className={`header__filter-btn ${activeFilter === filter.key ? 'header__filter-btn--active' : ''}`}
                                onClick={() => onFilterChange(filter.key)}
                            >
                                {filter.label}
                                {filterCounts && filterCounts[filter.key] !== undefined && (
                                    <span className="header__filter-count">({filterCounts[filter.key]})</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search Input */}
                {showSearch && (
                    <div className="header__search">
                        <input
                            type="text"
                            className="input input--search"
                            placeholder="검색..."
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                )}

                <div className="header__actions">
                    <button
                        className="header__action-btn header__action-btn--refresh"
                        onClick={handleRefresh}
                        title="새로고침"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button className="header__action-btn" title="알림">
                        <Bell size={20} />
                        <span className="header__action-badge"></span>
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;
